import { type EventInput } from "@fullcalendar/react";
import { format } from "date-fns-tz";
import { toast } from "react-toastify";
import Flag from "react-flagkit";
import { BiCheckCircle, BiChevronDown, BiCopy, BiTrash } from "react-icons/bi";
import {
  convertToDate,
  copyToClipboard,
  getGroupedSlots,
  getCopyTitle,
  getDateLocale,
  getHourText,
  getTimeZoneAbv,
  getLanguageName,
} from "@agreeto/calendar-core";
import { ulid } from "ulid";
import { Language, Membership } from "@agreeto/api/types";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { trpc } from "../../utils/trpc";
import { useEventStore, useTZStore } from "../../utils/store";
import clsx from "clsx";
import { Spinner } from "@agreeto/ui";
import { useState } from "react";
import { type SharedRoutes } from "../../calendar";

const getCountryCode = (lang: Language | undefined) =>
  lang === Language.EN ? "US" : lang;

const Availability: React.FC<{
  onPageChange?: (page: SharedRoutes) => void;
}> = ({ onPageChange }) => {
  const utils = trpc.useContext();

  const selectedSlots = useEventStore((s) => s.selectedSlots);
  const deleteSlot = useEventStore((s) => s.deleteSlot);

  const timeZones = useTZStore((s) => s.timeZones);
  const selectedTimeZone = useTZStore((s) => s.selectedTimeZone);
  const changeSelectedTimeZone = useTZStore((s) => s.changeSelectedTimeZone);

  const { data: user } = trpc.user.me.useQuery();
  const isFree = user?.membership === Membership.FREE;

  const { data: preference, isLoading: isLoadingPreference } =
    trpc.preference.byCurrentUser.useQuery();
  const locale = getDateLocale(preference);

  const { mutate: updatePreference, isLoading: isUpdatingPreference } =
    trpc.preference.update.useMutation({
      onSettled() {
        utils.preference.byCurrentUser.invalidate();
      },
    });

  const [copied, setCopied] = useState(false);

  const languageDropdown = (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        disabled={isLoadingPreference || isUpdatingPreference}
      >
        <div className="flex h-6 w-14 items-center space-x-3 rounded border border-gray-300 bg-white px-2 text-gray-700">
          {isLoadingPreference ? (
            <Spinner />
          ) : (
            <Flag
              country={getCountryCode(preference?.formatLanguage)}
              size={16}
            />
          )}
          <BiChevronDown className="h-full" />
        </div>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content
        className="z-10 rounded bg-white text-gray-700"
        style={{ boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.10)" }}
        align="end"
      >
        {Object.values(Language)
          // put english first
          .sort((a) => (a === Language.EN ? -1 : 1))
          .slice(0, isFree ? 2 : Object.values(Language).length)
          .map((lang, idx) => {
            return (
              <>
                <DropdownMenu.Item
                  key={lang}
                  disabled={isFree && idx > 0}
                  onSelect={() => {
                    updatePreference({ formatLanguage: lang });
                  }}
                >
                  <div
                    style={{ opacity: isFree && idx > 0 ? 0.5 : 1 }}
                    className={clsx(
                      "flex w-40 cursor-pointer items-center py-3 pl-4",
                      {
                        "cursor-not-allowed": isFree && idx > 0,
                      },
                    )}
                  >
                    <Flag country={lang === "EN" ? "US" : lang} size={20} />
                    <div className="pl-4 text-sm">{getLanguageName(lang)}</div>
                  </div>
                </DropdownMenu.Item>
                {idx < Object.values(Language).length - 1 && (
                  <DropdownMenu.Separator
                    className="mx-3 h-px bg-gray-100"
                    style={{ height: "1px" }}
                  />
                )}
              </>
            );
          })}
        {isFree && (
          <div className="p-4">
            <div className="text-sm font-semibold text-gray-900">
              Unlock More Languages
            </div>
            <div className="mt-2 text-xs text-gray-900">
              This feature is part of the Pro Plan
            </div>
            <div
              className="mt-8 flex h-8 w-full cursor-pointer items-center justify-center rounded border border-primary text-primary"
              onClick={() => onPageChange?.("/settings/subscription")}
            >
              Upgrade
            </div>
          </div>
        )}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );

  const timeZoneDropdown = (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <div className="flex h-6 items-center space-x-2 rounded border border-gray-300 bg-white py-1 px-1 text-gray-700">
          <div className="text-2xs">{getTimeZoneAbv(selectedTimeZone)}</div>
          <BiChevronDown className="h-4 w-4" />
        </div>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content
        className="z-10 rounded bg-white text-gray-700"
        align="end"
        style={{ boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.10)" }}
      >
        {timeZones.map((tz, idx) => (
          <DropdownMenu.Item
            key={`${tz}-${idx}`}
            onSelect={() => changeSelectedTimeZone(tz)}
          >
            <div className="cursor-pointer bg-white px-3 py-1">
              <div className="text-xs">{getTimeZoneAbv(tz)}</div>
            </div>
          </DropdownMenu.Item>
        ))}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );

  return (
    <>
      <div className="w-100 flex items-center justify-between">
        <div>
          <span className="text-sm">Snippet Preview</span>
        </div>
        <div className="flex space-x-2 leading-none">
          <div>{timeZoneDropdown}</div>
          <div>{languageDropdown}</div>
        </div>
      </div>

      <div className="pt-2">
        <div className="h-48 overflow-auto rounded border border-gray-50 bg-white py-1 pl-3 pr-1">
          <div className="flex p-1 text-gray-700">
            <span className="flex-1">
              {selectedSlots.length
                ? getCopyTitle(preference)
                : "Selected slots will appear here"}
            </span>
            <button
              className="h-7 w-7 pl-1"
              title="copy"
              disabled={selectedSlots.length === 0}
              onClick={() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
                copyToClipboard(selectedSlots, preference);
                toast("Saved to clipboard!", {
                  position: "bottom-center",
                  hideProgressBar: true,
                  autoClose: 1000,
                  type: "info",
                });
              }}
            >
              {copied ? (
                <BiCheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <BiCopy className="h-5 w-5" />
              )}
            </button>
          </div>
          {Object.keys(getGroupedSlots(selectedSlots)).map((key, idx) => {
            const events: EventInput[] = getGroupedSlots(selectedSlots)[key];
            const firstEvent = events[0];
            if (!firstEvent) return null;

            return (
              <div className="text-xs-05 pb-1 text-gray-700" key={idx}>
                {/* Day */}
                <div className="font-bold">
                  {format(convertToDate(firstEvent.start), "MMMM d (EEEE)", {
                    locale,
                    timeZone: selectedTimeZone,
                  })}
                </div>
                {/* Hours */}
                {events.map((event) => {
                  const { start, end, id } = event;
                  return (
                    // todo: update to a proper id
                    <div className="flex items-center" key={id ?? ulid()}>
                      <span>•</span>
                      <span className="pl-1">
                        {`${getHourText(convertToDate(start), {
                          locale,
                          timeZone: selectedTimeZone,
                        })} - ${getHourText(convertToDate(end), {
                          locale,
                          timeZone: selectedTimeZone,
                        })} ${getTimeZoneAbv(
                          selectedTimeZone,
                          convertToDate(start),
                        )}`}
                      </span>
                      <BiTrash
                        className="ml-3 h-4 w-4 cursor-pointer"
                        onClick={() => deleteSlot(event)}
                      />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default Availability;
