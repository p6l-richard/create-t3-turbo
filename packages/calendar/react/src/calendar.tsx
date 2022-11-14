import "@agreeto/tailwind-config";
import "@agreeto/ui/dist/styles.css";
import "react-toastify/dist/ReactToastify.css";
import { add, endOfWeek, startOfWeek } from "date-fns";
import ActionPane from "./components/action-pane";
import { useEffect, useState } from "react";
import { ControlBar } from "./components/control-bar";

import CalendarItem from "./components/calendar-item";
import { type CalendarApi } from "@fullcalendar/react";
import ConfirmationPane from "./components/confirmation-pane";

import { type PLATFORM } from "@agreeto/calendar-core";
import { type PRIMARY_ACTION_TYPES } from "./utils/enums";
import { trpc } from "./utils/trpc";
import { type RouterOutputs } from "@agreeto/api";
import {
  useCalendarStore,
  useEventStore,
  useTZStore,
  useViewStore,
} from "./utils/store";
import { Language, Membership } from "@agreeto/api/types";

type Props = {
  onClose?: () => void;
  renderKey?: number;
  platform?: PLATFORM;
  onPageChange?: (page: string) => void;
  onPrimaryActionClick?: (type: PRIMARY_ACTION_TYPES) => void;
};

type DirectoryUser = RouterOutputs["event"]["directoryUsers"][number];

const Calendar: React.FC<Props> = ({
  onClose,
  renderKey,
  platform = "web",
  onPageChange,
  onPrimaryActionClick: _primaryActionClick,
}) => {
  const utils = trpc.useContext();

  const setFocusedDate = useCalendarStore((s) => s.setFocusedDate);

  const period = useEventStore((s) => s.period);
  const selectedSlots = useEventStore((s) => s.selectedSlots);
  const selectedEventGroupId = useEventStore((s) => s.selectedEventGroupId);
  const selectEventGroup = useEventStore((s) => s.selectEventGroup);

  const openPane = useViewStore((s) => s.openPane);
  const changePane = useViewStore((s) => s.changePane);

  const setTzDefaults = useTZStore((s) => s.setTimeZoneDefaults);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [calendarRef, setCalendarRef] = useState<any>();
  const [directoryUsersWithEvents, setDirectoryUsersWithEvents] = useState<
    DirectoryUser[]
  >([]);

  const { data: events, isFetching: isFetchingEvents } =
    trpc.event.all.useQuery(period, { staleTime: 30 * 1000 });

  useEffect(() => {
    // get user from the query cache
    const user = utils.user.me.getData();
    setTzDefaults(user, platform);

    // Prefetch next week data
    utils.event.all.prefetch({
      startDate: startOfWeek(add(new Date(), { weeks: 1 })),
      endDate: endOfWeek(add(new Date(), { weeks: 1 })),
    });

    if (platform === "ext") {
      chrome.storage.onChanged.addListener((changes) => {
        // If time zone changes on another tab, then update
        if (
          changes.timeZones ||
          changes.recentlyUsedTimeZones ||
          changes.selectedTimeZone
        ) {
          setTzDefaults(user, platform);
        }
      });
    }
    // Only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (calendarRef) {
      const calendarApi: CalendarApi = calendarRef.current.getApi();
      setFocusedDate(new Date(calendarApi.view.currentStart));
    }
  }, [calendarRef, setFocusedDate]);

  useEffect(() => {
    if (selectedSlots.length > 0) {
      changePane("action");
    }
  }, [selectedSlots, changePane]);

  // Unselect the eventGroupId when the confirmation pane is closed
  useEffect(() => {
    if (openPane !== "confirmation") {
      selectEventGroup(null);
    }
  }, [openPane, selectEventGroup]);

  // Sometimes, resizing of calendar breaks in the page. For this
  // situations we are updating size on every visibility change
  useEffect(() => {
    if (calendarRef) {
      const calendarApi: CalendarApi = calendarRef.current.getApi();
      setTimeout(() => {
        calendarApi.updateSize();
      }, 10);
    }
  }, [renderKey, calendarRef]);

  // FIXME: Maybe we should do this on server - check back when payment stuff is done
  // Verify locale when membership changes
  const { data: user } = trpc.user.me.useQuery();
  const { mutate: updatePreference } = trpc.preference.update.useMutation({
    onSettled() {
      utils.user.me.invalidate();
      utils.preference.byCurrentUser.invalidate();
    },
  });
  useEffect(() => {
    if (user && user.membership === Membership.FREE) {
      updatePreference({
        formatLanguage: Language.EN,
      });
    }
  }, [user, updatePreference]);

  return (
    <div className="flex h-full">
      <div
        className="p-8"
        style={{
          width: openPane ? "calc(100% - 325px)" : "100%",
        }}
      >
        <div className="w-full pb-4">
          <ControlBar calendarRef={calendarRef} />
        </div>

        <div className={`w-full ${isFetchingEvents ? "animate-pulse" : ""}`}>
          <CalendarItem
            events={events}
            onRefSettled={setCalendarRef}
            directoryUsersWithEvents={directoryUsersWithEvents}
            onPageChange={onPageChange}
          />
        </div>
      </div>

      <div
        className="shrink-0"
        style={{
          width: openPane ? "325px" : 0,
        }}
      >
        {openPane === "action" ? (
          <ActionPane
            onClose={onClose}
            directoryUsersWithEvents={directoryUsersWithEvents}
            onDirectoryUsersWithEventsChange={setDirectoryUsersWithEvents}
            onPageChange={onPageChange}
          />
        ) : (
          openPane === "confirmation" &&
          !!selectedEventGroupId && (
            <ConfirmationPane
              onClose={onClose}
              eventGroupId={selectedEventGroupId}
              directoryUsersWithEvents={directoryUsersWithEvents}
              onDirectoryUsersWithEventsChange={setDirectoryUsersWithEvents}
            />
          )
        )}
      </div>
    </div>
  );
};

export default Calendar;
