import { router, privateProcedure } from "../trpc";
import { z } from "zod";
// import { TRPCError } from "@trpc/server";

export const accountRouter = router({
  // Get the accounts for the current user
  me: privateProcedure.query(async ({ ctx }) => {
    return ctx.prisma.account.findMany({
      where: { userId: ctx.user.id },
    });
  }),

  // Get related accounts for the current user
  related: privateProcedure
    .input(
      z.object({
        id: z.string().optional(),
        email: z.string().email().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.prisma.account.findMany({
        where: {
          id: { not: input.id },
          userId: ctx.user.id,
          email: { not: input.email },
        },
        select: {
          id: true,
          provider: true,
          email: true,
        },
      });
    }),

  // deleteByEmail: privateProcedure
  //   .input(
  //     z.object({
  //       email: z.string().email(),
  //     })
  //   )
  //   .mutation(async ({ ctx, input }) => {
  //     if (input.email !== ctx.user.email) {
  //       throw new TRPCError({
  //         code: "UNAUTHORIZED",
  //         message: "The entered email does not match your account",
  //       });
  //     }
  //     return ctx.prisma.account.delete({
  //       where: {
  //         email: input.email,
  //       },
  //     });
  //   }),
});
