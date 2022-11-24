import { Membership } from "@agreeto/api/types";
import { Button } from "@agreeto/ui";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import clsx from "clsx";
import React from "react";
import { FaUser } from "react-icons/fa";
import { HiCheckCircle } from "react-icons/hi";

import { trpcApi } from "~features/trpc/api/hooks";

// import { client } from "~features/trpc/chrome/client";

export const Settings = () => {
  const utils = trpcApi.useContext();
  const { data: user } = trpcApi.user.me.useQuery();
  const { data: accounts } = trpcApi.account.me.useQuery();
  const { data: primaryAccount } = trpcApi.account.primary.useQuery();
  const { mutate: changePrimary } = trpcApi.user.changePrimary.useMutation({
    onSuccess() {
      utils.account.primary.invalidate();
    },
  });
  const { mutate: upgradeAccount } = trpcApi.stripe.checkout.create.useMutation(
    {
      async onSuccess({ checkoutUrl }) {
        // Redirect to Stripe checkout
        // client.openTab.mutate(checkoutUrl);
        await chrome.tabs.create({ url: checkoutUrl });
      },
    },
  );
  const { mutate: createBillingPortalSession } =
    trpcApi.stripe.subscription.createBillingPortalSession.useMutation({
      async onSuccess({ url }) {
        // Redirect to Stripe checkout
        // client.openTab.mutate(checkoutUrl);
        await chrome.tabs.create({ url });
      },
    });

  return (
    <div className="w-full">
      <div className="flex items-center flex-1 h-16 gap-4 py-4 border-b border-gray-200">
        <h2 className="pl-2 text-xl font-bold">Settings</h2>
        <Button
          onClick={() => {
            window.open(
              `${
                process.env.PLASMO_PUBLIC_WEB_URL
              }/api/auth/signin?${new URLSearchParams({
                callbackUrl: `${process.env.PLASMO_PUBLIC_WEB_URL}/auth/extension`,
              })}`,
            );
          }}
        >
          Add Account
        </Button>
        {user?.membership === Membership.FREE ? (
          <Button onClick={() => upgradeAccount()}>Upgrade Account</Button>
        ) : (
          <Button onClick={() => createBillingPortalSession()}>
            Manage Subscription
          </Button>
        )}
        <Button
          onClick={() => {
            window.open(`${process.env.PLASMO_PUBLIC_WEB_URL}/auth/signout`);
          }}
        >
          Sign Out
        </Button>

        {/* Account Switch */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="flex items-center justify-center w-8 h-8 rounded bg-primary">
              <FaUser className="w-6 h-6 text-white" />
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="text-gray-900 bg-white border rounded shadow-xl"
              sideOffset={5}
            >
              {accounts?.map((a, idx) => (
                <DropdownMenu.Item
                  key={a.id}
                  onSelect={() => changePrimary({ id: a.id })}
                >
                  <div
                    className={clsx(
                      "flex items-center justify-between gap-3 p-2 border-gray-900 hover:opacity-80 cursor-pointer",
                      { "border-b": idx !== accounts.length - 1 },
                    )}
                  >
                    <div className="text-sm">{a.email}</div>
                    {a.id === primaryAccount?.id && (
                      <HiCheckCircle className="h-6 text-primary" />
                    )}
                  </div>
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
      {primaryAccount && (
        <div className="p-2">
          <h3 className="text-lg font-bold">Primary Account</h3>
          <p>{primaryAccount.email}</p>
          <p>{primaryAccount.provider}</p>
          <p>You&apos;re currently on the {user?.membership} plan.</p>
          {user ? (
            user.subscriptionCanceledDate ? (
              <p>Expires at {user.paidUntil?.toDateString()}</p>
            ) : (
              <p>Next payment {user.paidUntil?.toDateString()}</p>
            )
          ) : (
            <p>No active subscription</p>
          )}
        </div>
      )}
    </div>
  );
};
