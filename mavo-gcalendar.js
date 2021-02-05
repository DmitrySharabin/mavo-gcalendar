// @ts-check

/**
 * Google Calendar backend plugin for Mavo
 * @author Dmitry Sharabin and contributors
 * @version %%VERSION%%
 */

(($) => {
	"use strict";

	Mavo.Plugins.register("gcalendar", {});

	const _ = Mavo.Backend.register($.Class({
		extends: Mavo.Backend,
		id: "Google Calendar",

		constructor (url, o) {
			this.permissions.on(["read", "login"]);

			this.login(true);
		},

		update (url, o) {
			this.super.update.call(this, url, o);
		},

		async login (passive) {
			try {
				await this.oAuthenticate(passive);
				await this.getUser();

				if (this.user) {
					this.permissions.on(["logout"]);
				}
			} catch (e) {
				if (e.status === 401) {
					// Unauthorized. Access token we have is invalid, discard it.
					this.logout();
				}
			}
		},

		async logout () {
			await this.oAuthLogout();

			this.user = null;
		},

		async getUser () {
			if (this.user) {
				return this.user;
			}

			const info = await this.request("https://www.googleapis.com/oauth2/v2/userinfo");

			this.user = {
				name: info.name,
				avatar: info.picture,
				info
			};

			$.fire(this.mavo.element, "mv-login", { backend: this });
		},

		oAuthParams: () => `&redirect_uri=${encodeURIComponent("https://auth.mavo.io")}&response_type=code&scope=${encodeURIComponent(_.scopes.join(" "))}`,

		static: {
			apiDomain: "https://www.googleapis.com/calendar/v3/calendars/",
			oAuth: "https://accounts.google.com/o/oauth2/auth",
			scopes: [
				"https://www.googleapis.com/auth/calendar.readonly",
				"https://www.googleapis.com/auth/calendar.events.readonly",
				"https://www.googleapis.com/auth/calendar.settings.readonly",
				"https://www.googleapis.com/auth/userinfo.profile"
			],
			useCache: false,

			test (value) {
				return /^https:\/\/...\/?.*/.test(value);
			}
		}
	}));

	Mavo.Locale.register("en", {});

})(Bliss);
