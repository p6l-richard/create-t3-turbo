import { NextPage } from "next";
import { signOut } from "next-auth/react";
import Router from "next/router.js";
import { clientEnv } from "../../env/schema.mjs";

const Success: NextPage = () => {
  return (
    <div>
      <p>Are you sure you want to sign out?</p>
      <button
        onClick={() => {
          // first, log out the extension (resets chrome.storage)
          // FIXME: eslint complains about no-undef -- requires global declaration at top of file maybe? (richard)
          // eslint-disable-next-line
          chrome.runtime.sendMessage(
            clientEnv.NEXT_PUBLIC_EXTENSION_ID as string,
            "signout",
            (response) => {
              if (response.success) {
                // log out the apps/web using NextAuth
                signOut({ callbackUrl: "/" });
                Router.push("/auth/signout/success");
              } else {
                Router.push("/auth/signout/error");
              }
            }
          );
        }}
      >
        Sign out
      </button>
    </div>
  );
};
export default Success;
