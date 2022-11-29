import Calendar from "@agreeto/calendar-react";
import {
  type ReactLocationOptions,
  type Route,
  createMemoryHistory,
} from "@tanstack/react-location";

import { trpcApi } from "~features/trpc/api/hooks";
import { Accounts } from "~pages/accounts";
import { Settings } from "~pages/settings";

// Create a memory history
export const reactLocationOptions: ReactLocationOptions = {
  history: createMemoryHistory({
    initialEntries: ["/calendar"], // Pass your initial url
  }),
};

// REVIEW (richard): this is not used anymore?
export const getRoutes: () => Route[] = () => {
  const utils = trpcApi.useContext();
  return [
    {
      path: "calendar",
      element: <Calendar />,
    },
    {
      path: "settings",
      element: <Settings />,
      // TODO: add account fetching to the settings route
      async loader({ params: _p }) {
        // console.log({ params });
        // FIXME: Should prob not include all this information
        utils.account.me.fetch();
        return {};
        // accounts: await utils.account.all.fetch()
      },
    },
    {
      path: "accounts",
      element: <Accounts />,
      // TODO: add account fetching to the settings route
      async loader({ params: _p }) {
        // FIXME: Should prob not include all this information
        utils.account.me.fetch();
        return {};
      },
    },
  ];
};
