import { type Account, type Event } from "@agreeto/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { GoogleCalendarService } from "../services/google.calendar";
import { MicrosoftCalendarService } from "../services/microsoft.calendar";
import { privateProcedure, router } from "../trpc";
import { AttendeeValidator } from "../validators/attendee";

const getCalendarService = (account: Account, event?: Event) => {
  switch (account.provider) {
    case "google":
      return {
        service: new GoogleCalendarService(
          account.access_token,
          account.refresh_token
        ),
        eventId: event?.id,
      };
    case "azure-ad":
      return {
        service: new MicrosoftCalendarService(
          account.access_token,
          account.refresh_token
        ),
        eventId: event?.microsoftId,
      };
    default:
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Provider ${account.provider} not supported`,
      });
  }
};

export const eventGroupRouter = router({
  byId: privateProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const group = await ctx.prisma.eventGroup.findFirst({
        where: {
          id: input.id,
          deletedAt: null,
        },
        include: {
          account: true,
          events: {
            where: {
              deletedAt: null,
            },
          },
        },
      });

      if (!group) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `EventGroup with id ${input.id} not found`,
        });
      }

      if (group.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: `EventGroup with id ${input.id} does not belong to user ${ctx.user.id}`,
        });
      }

      return group;
    }),

  create: privateProcedure
    .input(
      z.object({
        createBlocker: z.boolean(),
        title: z.string(),
        events: z
          .object({
            id: z.string().optional(),
            title: z.string(),
            startDate: z.string(),
            endDate: z.string(),
            attendees: AttendeeValidator.array(),
            attendeeEmails: z.string().array(),
          })
          .array(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const accounts = await ctx.prisma.account.findMany({
        where: {
          userId: ctx.user.id,
        },
      });
      const accountEmails = accounts.map((a) => a.email) as string[];
      const primaryAccount = accounts.find((a) => a.isPrimary);

      if (!primaryAccount) {
        // Should not happen
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User has no primary account",
        });
      }

      const group = await ctx.prisma.eventGroup.create({
        data: {
          title: input.title,
          userId: ctx.user.id,
          accountId: primaryAccount.id,
          createBlocker: input.createBlocker,
          events: {
            create: input.events.map((event) => ({
              userId: ctx.user.id,
              account: {
                connect: {
                  id: primaryAccount?.id,
                },
              },
              startDate: event.startDate,
              endDate: event.endDate,
              title: event.title,
              attendees: event.attendees,
              deletedAt: null,
            })),
          },
        },
      });

      if (input.createBlocker) {
        // Create actual events in calendars if createBlocer is true
        const promises = [];

        const savedEvents = await ctx.prisma.event.findMany({
          where: {
            deletedAt: null,
            eventGroupId: group.id,
          },
          include: {
            attendees: true,
          },
        });

        // Initialize calendar service
        const { service } = getCalendarService(primaryAccount);

        savedEvents.forEach((ev) => {
          const attendeeEmails = new Set([
            ...ev.attendees.map((a) => a.email),
            ...accountEmails,
          ]);

          promises.push(
            service
              .createEvent({
                id: ev.id,
                title: ev.title,
                attendeeEmails: [...attendeeEmails],
                startDate: ev.startDate.toISOString(),
                endDate: ev.endDate.toISOString(),
              })
              .then(async ({ event }) => {
                // Update microsoft id of event
                if (event.microsoftId) {
                  // We save microsoftId to our DB to be able to delete the event later
                  // We don't need this in Google since we can overwrite created event ID in Google
                  await ctx.prisma.event.update({
                    where: { id: ev.id },
                    data: {
                      microsoftId: event.microsoftId,
                    },
                  });
                }
                return event;
              })
          );
        });
      }

      return group;
    }),

  delete: privateProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const group = await ctx.prisma.eventGroup.findFirst({
        where: {
          id: input.id,
          deletedAt: null,
        },
        include: {
          account: true,
          events: {
            where: {
              deletedAt: null,
            },
          },
        },
      });

      if (!group) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `EventGroup with id ${input.id} not found`,
        });
      }

      if (group.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: `EventGroup with id ${input.id} does not belong to user ${ctx.user.id}`,
        });
      }

      // Delete from actual calendars if created
      group.createBlocker &&
        (await Promise.all(
          group.events.map((event) => {
            // Initialize the service
            const { service, eventId } = getCalendarService(
              group.account,
              event
            );

            return service
              .deleteEvent(eventId as string)
              .catch((err) =>
                console.error(
                  `Failed to delete the event from the calendar service for the event: ${eventId}`,
                  err
                )
              );
          })
        ));

      // "Delete" event from DB
      await ctx.prisma.event.updateMany({
        where: {
          eventGroupId: group.id,
        },
        data: { deletedAt: new Date() },
      });

      // "Delete" event group from DB
      return await ctx.prisma.eventGroup.update({
        where: { id: group.id },
        data: { deletedAt: new Date() },
      });
    }),
});
