import type { ReactNode } from "react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { Button } from "../button";
import { BsExclamationCircle } from "react-icons/bs";
import { TiWarningOutline } from "react-icons/ti";
import { BiInfoCircle } from "react-icons/bi";
import { HiCheckCircle } from "react-icons/hi";
import clsx from "clsx";

// ==============================
// Radix Components
// https://github.com/radix-ui/primitives/blob/main/packages/react/alert-dialog/src/index.ts
// ==============================
export const Root = AlertDialog.Root;
export const Trigger = AlertDialog.Trigger;
export const Portal = AlertDialog.Portal;
export const Overlay = AlertDialog.Overlay;
export const Content = AlertDialog.Content;
export const Action = AlertDialog.Action;
export const Cancel = AlertDialog.Cancel;
export const Title = AlertDialog.Title;
export const Description = AlertDialog.Description;

// ==============================
// CUSTOM OVERRIDES
// ==============================

// ==============================
// CUSTOM COMPONENTS
// ==============================

export const Body = ({ children }: { children: ReactNode }) => (
  <AlertDialog.Portal>
    <AlertDialog.Overlay className="fixed inset-0 bg-blackA-9 opacity-80 transition-opacity" />
    <AlertDialog.Content className="l-1/2 fixed top-1/2 left-1/2 w-3/5 -translate-x-1/2 -translate-y-1/2 rounded-md bg-white shadow-sm shadow-transparent">
      {children}
    </AlertDialog.Content>
  </AlertDialog.Portal>
);

// ==============================
// More complete dialog
// ==============================

export const Dialog = ({
  trigger,
  variant,
  title,
  description,
  cancelLabel = "Cancel",
  cancelFn,
  actionLabel,
  actionFn,
}: {
  trigger: ReactNode;
  variant: "error" | "warning" | "info" | "success";
  title: string;
  description: string;
  cancelLabel?: string;
  cancelFn?: () => void;
  actionLabel: string;
  actionFn?: () => void;
}) => {
  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger asChild>{trigger}</AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 bg-gray-5 opacity-80 transition-opacity" />
        <AlertDialog.Content className="l-1/2 fixed top-1/2 left-1/2 w-3/5 -translate-x-1/2 -translate-y-1/2 bg-white shadow-sm shadow-transparent">
          {/* Dialog Body */}
          <div
            className={clsx(
              "flex w-full flex-col gap-2 border-t-4 p-3",
              variant === "error" && "border-red-600",
              variant === "warning" && "border-yellow-600",
              variant === "info" && "border-blue-600",
              variant === "success" && "border-green-600",
            )}
          >
            <div className="m-2 mb-1 flex items-center gap-2 font-bold">
              <div
                className={clsx(
                  "flex h-8 w-8 items-center justify-center rounded-full p-[.33em]",
                  variant === "error" && "bg-red-100",
                  variant === "warning" && "bg-yellow-100",
                  variant === "info" && "bg-blue-100",
                  variant === "success" && "bg-green-100",
                )}
              >
                {variant === "error" ? (
                  <BsExclamationCircle className="h-6 w-6 rounded-full bg-white text-red-600" />
                ) : variant === "warning" ? (
                  <TiWarningOutline className="h-6 w-6 rounded-full bg-white text-yellow-600" />
                ) : variant === "info" ? (
                  <BiInfoCircle className="h-6 w-6 rounded-full bg-white text-blue-600" />
                ) : variant === "success" ? (
                  <HiCheckCircle className="h-6 w-6 rounded-full bg-white text-green-600" />
                ) : null}
              </div>
              <span className="text-base font-medium text-gray-900">
                {title}
              </span>
            </div>
            <h3 className="ml-12 mb-2 text-sm font-light text-gray-700">
              {description}
            </h3>
          </div>
          {/* Dialog Footer */}
          <div className="flex justify-end gap-6 bg-mauve-2 p-3">
            <AlertDialog.Cancel asChild>
              <Button variant="glass" onClick={cancelFn}>
                {cancelLabel}
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <Button variant={variant} onClick={actionFn}>
                {actionLabel}
              </Button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
};
