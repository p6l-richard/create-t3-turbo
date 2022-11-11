import type { FC } from "react";
import { useState } from "react";
import checkmarkBlueIcon from "../../assets/check-mark-blue.svg";
import plusIcon from "../../assets/plus.svg";
import { Popover } from "@headlessui/react";
import OutsideClickHandler from "react-outside-click-handler";
import searchIcon from "../../assets/search.svg";
import uniq from "lodash/uniq";
import { Membership, getTimeZoneAbv } from "@agreeto/calendar-core";
import { Float } from "@headlessui-float/react";
import { trpc } from "../../utils/trpc";
import { useStore } from "../../utils/store";

type Props = {
  value: string;
  index: number;
  type: "primary" | "secondary" | "addIcon";
  referenceDate?: Date;

  onPageChange?: (page: string) => void;
};

const TimeZoneSelect: FC<Props> = ({
  value,
  index,
  type,
  referenceDate,
  onPageChange,
}) => {
  const { data: user } = trpc.user.me.useQuery();
  const isFree = user?.membership === Membership.FREE;

  const recentlyUsedTimeZones = useStore((s) => s.recentlyUsedTimeZones);
  const timeZones = useStore((s) => s.timeZones);
  const deleteTimeZone = useStore((s) => s.deleteTimeZone);
  const addTimeZone = useStore((s) => s.addTimeZone);
  const changeTimeZone = useStore((s) => s.changeTimeZone);

  const [isOpen, setIsOpen] = useState(false);
  const [showProTooltip, setShowProTooltip] = useState(false);
  const [searchText, setSearchText] = useState("");

  const title =
    type === "addIcon" ? (
      <img src={plusIcon} style={{ opacity: isFree ? "0.3" : "1" }} alt="" />
    ) : (
      getTimeZoneAbv(value, referenceDate)
    );

  const uniqTimeZones = uniq([
    ...(type === "addIcon" ? [] : [value]),
    ...recentlyUsedTimeZones,
  ]).slice(0, 5);
  // First filter the selected timeZones then put them into the front
  const timeZoneList: string[] = (Intl as any)
    .supportedValuesOf("timeZone")
    .filter((t: string) => !uniqTimeZones.includes(t));
  timeZoneList.unshift(...uniqTimeZones);

  // This is used to separate last used time zones from other time zones with a divider
  let latestItemStatus: "selected" | "none" = "none";

  return (
    <Popover
      className="relative leading-4"
      onMouseLeave={() => setShowProTooltip(false)}
    >
      <Popover.Button>
        <Float
          show={isFree && type !== "primary" && showProTooltip}
          arrow
          flip
          className="cursor-auto"
        >
          <div onMouseEnter={() => setShowProTooltip(true)}>
            <div
              className={`text-3xs-05 group flex items-center justify-center rounded border ${
                type === "primary"
                  ? "color-primary cursor-pointer"
                  : !isFree
                  ? "cursor-pointer border-[#F0F1F2] bg-[#F0F1F2] hover:border-gray-300"
                  : "border-[#F0F1F2] bg-[#F0F1F2]"
              } ${
                type === "addIcon"
                  ? "mr-2 w-6"
                  : timeZones.length === 1
                  ? "text-2xs w-12"
                  : "text-3xs-05 w-10"
              }`}
              onClick={() => {
                if (isFree && type !== "primary") return;
                setIsOpen(true);
              }}
              style={{
                height: "22px",
              }}
            >
              {title}
              {/* Remove button */}
              {type === "secondary" && (
                <div>
                  <div
                    className={
                      "text-3xs-05 absolute flex h-4 w-0 cursor-pointer items-center justify-center rounded-full bg-gray-500 text-white hover:bg-gray-600 group-hover:w-4"
                    }
                    style={{
                      top: "-8px",
                      right: "-6px",
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteTimeZone(value);
                    }}
                  >
                    X
                  </div>
                </div>
              )}
            </div>
          </div>
          <div
            className="mt-4 w-60 cursor-auto rounded border border-[#F9FAFA] bg-[#F9FAFA] p-4 text-left"
            style={{ boxShadow: "2px 4px 12px 2px #dbd9d9" }}
          >
            <div className="color-gray-900 text-sm font-semibold">
              Unlock Multiple Time Zones
            </div>
            <div className="color-gray-900 mt-2 text-xs">
              This feature is part of the Pro Plan
            </div>
            <div
              className="border-primary color-primary mt-8 flex h-8 w-full cursor-pointer items-center justify-center rounded border"
              onClick={() => onPageChange?.("settings")}
            >
              Upgrade
            </div>
            <Float.Arrow
              className="absolute h-5 w-5 rotate-45 bg-[#F9FAFA]"
              offset={-12}
            />
          </div>
        </Float>
      </Popover.Button>

      {isOpen && (
        <Popover.Panel static>
          <OutsideClickHandler
            onOutsideClick={(e: any) => {
              // This check is put here to prevent unexpexted closes in the extension
              if (e.path?.find((p: any) => p.id === "timeZonePopupContainer")) {
                return;
              }
              setIsOpen(false);
            }}
          >
            <div
              className="color-gray-700 absolute z-10 w-80 rounded bg-white pt-6 shadow-xl"
              id="timeZonePopupContainer"
            >
              {/* Upper part */}
              <div className="px-5 pb-3">
                {/* Title */}
                <div className="flex items-center justify-between pb-4">
                  <div className="text-xl font-semibold">Time zone</div>

                  <div
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded border border-gray-50"
                    onClick={() => setIsOpen(false)}
                  >
                    X
                  </div>
                </div>

                {/* Search */}
                <div className="input-icon-after">
                  <input
                    className="h-8 w-full border-b border-gray-50 outline-none"
                    placeholder="Search for country or city"
                    autoFocus
                    onChange={(e) => {
                      setSearchText(e.target.value);
                    }}
                    value={searchText}
                  />
                  <div className="input-icon-container">
                    <img src={searchIcon} alt="info" />
                  </div>
                </div>
              </div>

              <div
                className="overflow-auto pb-4"
                style={{ maxHeight: "334px" }}
              >
                {timeZoneList
                  .filter((tz) => {
                    const isSame = tz === value;
                    const recentlyUsed = uniqTimeZones.some(
                      (tz2) => tz2 === tz,
                    );
                    const text = `(${getTimeZoneAbv(
                      tz,
                      referenceDate,
                    )}) ${tz}`.toLocaleLowerCase();

                    return (
                      isSame ||
                      recentlyUsed ||
                      text.indexOf(searchText.toLocaleLowerCase()) !== -1 ||
                      text
                        .replaceAll("_", " ")
                        .indexOf(searchText.toLocaleLowerCase()) !== -1
                    );
                  })
                  .map((tz: string) => {
                    const isSame = tz === value;
                    const recentlyUsed = uniqTimeZones.some(
                      (tz2) => tz2 === tz,
                    );

                    // Determine the location of divider which divides (selected + recently used) from (others)
                    let needsDivider = false;
                    if (
                      (isSame || recentlyUsed) &&
                      latestItemStatus === "none"
                    ) {
                      latestItemStatus = "selected";
                    } else if (
                      latestItemStatus === "selected" &&
                      !isSame &&
                      !recentlyUsed
                    ) {
                      latestItemStatus = "none";
                      needsDivider = true;
                    }

                    return (
                      <div key={tz}>
                        {/* Put divider */}
                        {needsDivider && (
                          <div className="my-1 px-3">
                            <div
                              className="bg-gray-200"
                              style={{ height: "1px" }}
                            />
                          </div>
                        )}
                        <div
                          className="flex h-8 cursor-pointer items-center justify-between px-5 text-sm hover:bg-gray-300"
                          onClick={() => {
                            if (type === "addIcon") {
                              addTimeZone(tz);
                            } else {
                              changeTimeZone(tz, index);
                            }
                          }}
                        >
                          {/* Timezone */}
                          <div>{`(${getTimeZoneAbv(
                            tz,
                            referenceDate,
                          )}) ${tz}`}</div>
                          {/* Checmkark */}
                          {isSame && (
                            <div>
                              <img
                                alt=""
                                className="h-4 w-4"
                                src={checkmarkBlueIcon}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </OutsideClickHandler>
        </Popover.Panel>
      )}
    </Popover>
  );
};

export default TimeZoneSelect;
