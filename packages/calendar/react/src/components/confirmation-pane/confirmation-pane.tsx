import { type FC, useEffect, useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import closeIcon from "../../assets/close.svg";
import backIcon from "../../assets/double-arrow-left.svg";

import { Attendees } from "./../action-pane/attendees";
import { EventResponseStatus } from "@agreeto/calendar-core";
// TODO: This modal should come from `ui` package. I disabled it because we are having trouble with tailwindcss
// on `ext` app when we import the modal from the `ui` package
import { Modal } from "../modal";

import { type RouterInputs, type RouterOutputs } from "@agreeto/api";
import { trpc } from "../../utils/trpc";
import { ConferenceElement } from "./conference-element.new";
import { EventElement } from "./event-element.new";
import { Title } from "./title.new";
import { useEventStore, useViewStore } from "../../utils/store";

type DirectoryUser = RouterOutputs["event"]["directoryUsers"][number];

type Props = {
  onClose?: () => void;

  eventGroupId: string;
  directoryUsersWithEvents: DirectoryUser[];
  onDirectoryUsersWithEventsChange: (users: DirectoryUser[]) => void;
};

const ConfirmationPane: FC<Props> = ({
  onClose,
  eventGroupId,
  directoryUsersWithEvents,
  onDirectoryUsersWithEventsChange,
}) => {
  const utils = trpc.useContext();

  const checkedEvent = useEventStore((s) => s.checkedEvent);

  const changePane = useViewStore((s) => s.changePane);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [addConference, setAddConference] = useState(false);
  const [title, setTitle] = useState("");
  const [unknownAttendees, setUnknownAttendees] = useState<
    RouterInputs["eventGroup"]["create"]["events"][number]["attendees"]
  >([]);

  useEffect(() => {
    setAddConference(false);
  }, [eventGroupId]);

  const { data: accounts } = trpc.account.me.useQuery();
  const primaryAccount = accounts?.find((a) => a.isPrimary);

  const { data: eventGroup, isLoading: isLoadingGroup } =
    trpc.eventGroup.byId.useQuery(
      { id: eventGroupId },
      {
        onSuccess: (eg) => {
          setTitle(eg.title || "");
        },
      },
    );

  const { mutate: confirmEvent, isLoading: isConfirming } =
    trpc.event.confirm.useMutation({
      onSuccess() {
        utils.event.all.invalidate();
        utils.eventGroup.byId.invalidate({ id: eventGroupId });
        toast("Selected slot is confirmed", {
          position: "bottom-center",
          hideProgressBar: true,
          autoClose: 1000,
          type: "success",
        });
      },
      onError() {
        toast("Failed to create events", {
          position: "bottom-center",
          hideProgressBar: true,
          autoClose: 2000,
          type: "error",
        });
      },
    });

  const { mutate: deleteEventGroup, isLoading: isDeleting } =
    trpc.eventGroup.delete.useMutation({
      onSuccess() {
        utils.event.all.invalidate();
        toast("Event group and its events deleted", {
          position: "bottom-center",
          hideProgressBar: true,
          autoClose: 1000,
          type: "success",
        });
        changePane("action");
      },
      onError() {
        toast("Failed to delete event group", {
          position: "bottom-center",
          hideProgressBar: true,
          autoClose: 2000,
          type: "error",
        });
      },
    });

  const handleSave = async () => {
    if (!checkedEvent || !checkedEvent.id) {
      toast("Please select a slot", {
        position: "bottom-center",
        hideProgressBar: true,
        autoClose: 2000,
        type: "error",
      });
      return;
    }

    // Save events to DB
    confirmEvent({
      id: checkedEvent.id,
      addConference,
      title,
      attendees: unknownAttendees.concat(
        directoryUsersWithEvents.map((u) => ({
          id: u.id,
          name: u.name,
          surname: u.surname,
          email: u.email,
          provider: u.provider,
          responseStatus: EventResponseStatus.NEEDS_ACTION,
        })),
      ),
    });
  };

  const handleDelete = async () => {
    setShowDeleteModal(false);
    deleteEventGroup({ id: eventGroupId });
  };

  return (
    <div className="h-full bg-gray-100 px-10 py-8">
      <div className="flex h-full flex-col justify-between">
        {/* Top */}
        <div>
          <div className="flex items-center justify-between">
            {/* Back icon */}
            <div>
              <img
                src={backIcon}
                alt="back"
                className="h-8 w-8 cursor-pointer"
                onClick={() => changePane("action")}
              />
            </div>

            {/* Close icon */}
            {onClose && (
              <div>
                <img
                  src={closeIcon}
                  alt="close"
                  className="h-8 w-8 cursor-pointer"
                  onClick={() => onClose?.()}
                />
              </div>
            )}
          </div>

          {/* Some padding */}
          <div className="pt-8" />
          {isLoadingGroup && <div>Loading...</div>}

          {/* Title */}
          <Title
            {...{
              title,
              setTitle,
              events: eventGroup?.events,
              isSelectionDone: !!eventGroup?.isSelectionDone,
            }}
          />

          {/* Events */}
          <div className="max-h-56 space-y-4 overflow-auto pt-1">
            {eventGroup?.events
              ?.sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
              .map((event) => (
                <EventElement key={event.id} event={event} />
              ))}
          </div>

          {/* Info */}
          {/* <div className="pt-4 leading-none text-center">
            <span className="color-gray-300 font-medium text-2xs-05">
              {!eventGroup?.isSelectionDone &&
                'Once you confirm a slot, other slots will be removed from your actual calendar(s)'}
            </span>
          </div> */}

          {/* Conference */}
          {eventGroup && !eventGroup.isSelectionDone && primaryAccount && (
            <div className="overflow-visible pt-2">
              <ConferenceElement
                {...{
                  eventGroup,
                  addConference,
                  setAddConference,
                  provider: primaryAccount.provider,
                }}
              />
            </div>
          )}

          {/* Attendees */}
          <div className="pt-4">
            <Attendees
              unknownAttendees={unknownAttendees}
              onUnknownAttendeesChange={setUnknownAttendees}
              directoryUsersWithEvents={directoryUsersWithEvents}
              onDirectoryUsersWithEventsChange={
                onDirectoryUsersWithEventsChange
              }
              eventGroup={eventGroup}
            />
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-4">
          {/* Save */}
          <div className="space-y-4">
            {!eventGroup?.isSelectionDone && (
              <button
                className="button w-full"
                onClick={handleSave}
                disabled={!checkedEvent || isConfirming || isDeleting}
              >
                Confirm
              </button>
            )}
            <button
              className="button-borderless button-borderless-danger w-full"
              onClick={() => setShowDeleteModal(true)}
              disabled={isConfirming || isDeleting}
            >
              Delete This Group
            </button>
          </div>
        </div>
        {/* End Save */}
      </div>

      <ToastContainer />

      <Modal
        open={showDeleteModal}
        title="Delete Event Group"
        description="Deleting an event group will also delete all its child events. If you created those events with Create Blocker flag, AgreeTo will attempt to delete them from your actual calendars as well"
        primaryButton={{
          text: "Delete",
          onClick: handleDelete,
          type: "danger",
        }}
        cancelButton={{
          text: "Cancel",
          onClick: () => setShowDeleteModal(false),
        }}
      />
    </div>
  );
};

export default ConfirmationPane;
