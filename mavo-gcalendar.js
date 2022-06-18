// @ts-check

/**
 * Google Calendar backend plugin for Mavo
 * @author Dmitry Sharabin and contributors
 * @version 0.1.0
 */

(($) => {
	"use strict";

	Mavo.Plugins.register("gcalendar", {});

	const _ = Mavo.Backend.register(class GCalendar extends Mavo.Backend {
		id = "Google Calendar"

		constructor (url, o) {
			super(url, o);

			this.permissions.on(["read", "login"]);

			this.login(true);
		}

		update (url, o) {
			super.update.call(this, url, o);

			const params = this.url.searchParams;
			this.calendar = o.calendar ?? params.get("src") ?? "primary";

			this.searchParams = Mavo.options(o.options ?? "");
		}

		async load () {
			let response;
			if (this.isAuthenticated()) {
				response = await fetch(this.apiURL(), {
					headers: {
						Authorization: `Bearer ${this.accessToken}`
					}
				});

				if (response.status === 401) {
					// Access token we have is invalid, discard it.
					await this.logout();
				}
			}
			else {
				// Try an unauthenticated request (with the API key) — let authors work with public calendars.
				response = await fetch(this.apiURL(false));
			}

			// If the previous request fails, try to send requests without the API key to get the real reason why we can't access the calendar.
			if (!response.ok && !this.isAuthenticated()) {
				response = await fetch(this.apiURL());
			}

			// The request failed? It doesn't make sense to proceed.
			if (!response.ok) {
				const error = (await response.json()).error.message;

				switch (response.status) {
					case 403:
						// No read permissions
						this.mavo.error(this.mavo._("mv-gcalendar-read-permission-denied"));
						break;
					case 404:
						// No calendar
						this.mavo.error(this.mavo._("mv-gcalendar-calendar-not-found"));
						break;
					default:
						Mavo.warn(error);
				}

				return null;
			}

			return (await response.json()).items ?? [];
		}

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
		}

		async logout () {
			await this.oAuthLogout();

			this.user = null;
		}

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

			// Make the plugin work both with the stable and the future versions of Mavo.
			if (this instanceof EventTarget) {
				$.fire(this, "mv-login");
			} else {
				// Mavo v0.2.4-
				$.fire(this.mavo.element, "mv-login", { backend: this });
			}
		}

		// === Actions ===

		async create_event (...events) {
			if (!this.isAuthenticated()) {
				this.mavo.error(this.mavo._("mv-gcalendar-create-event-not-authenticated"));
				return;
			}

			const baseURL = _.apiDomain + this.calendar + "/events/quickAdd";

			for (const event of events) {
				const url = baseURL + "?text=" + encodeURIComponent(event);
				const response = await fetch(url, {
					method: "POST",
					headers: {
						Authorization: `Bearer ${this.accessToken}`
					}
				});

				if (!response.ok) {
					const error = (await response.json()).error.message;

					switch (response.status) {
						case 403:
							// No write permissions
							this.mavo.error(this.mavo._("mv-gcalendar-write-permission-denied"));
							break;
						default:
							Mavo.warn(error);
					}
				}
			}

			const data = await this.load();
			if (Mavo.prototype.push) {
				$.fire(this, "mv-remotedatachange", { data });
			}
			else {
				// Mavo v0.2.4-
				this.mavo.render(data);
			}
		}

		async delete_event (...ref) {
			if (!this.isAuthenticated()) {
				this.mavo.error(this.mavo._("mv-gcalendar-delete-event-not-authenticated"));
				return;
			}

			const nodes = Mavo.Actions.getNodes(ref.flat());
			const events = [];

			for (const node of nodes) {
				if (!node) {
					continue;
				}

				events.push(node.getData());
			}

			const baseURL = _.apiDomain + this.calendar + "/events/";

			for (const event of events) {
				const url = baseURL + event.id;
				const response = await fetch(url, {
					method: "DELETE",
					headers: {
						Authorization: `Bearer ${this.accessToken}`
					}
				});

				if (!response.ok) {
					const error = (await response.json()).error.message;

					switch (response.status) {
						case 403:
							// No write permissions
							this.mavo.error(this.mavo._("mv-gcalendar-write-permission-denied"));
							break;
						case 410:
							// Event has already been deleted
							Mavo.warn(this.mavo._("mv-gcalendar-event-already-deleted", { event: event.summary }));
							break;
						default:
							Mavo.warn(error);
					}
				}
			}

			const data = await this.load();
			if (Mavo.prototype.push) {
				$.fire(this, "mv-remotedatachange", { data });
			}
			else {
				// Mavo v0.2.4-
				this.mavo.render(data);
			}
		}

		apiURL (withCredentials = true) {
			const params = { ..._.defaultParams, ...this.searchParams };
			
			const searchParams = new URLSearchParams();
			for(const [key, value] of Object.entries(params)) {
				searchParams.set(key, value);
			}

			if (!withCredentials) {
				searchParams.set("key", _.apiKey)
			}
			
			return `${_.apiDomain}${encodeURIComponent(this.calendar)}/events?${searchParams}`;
		}

		oAuthParams = () => `&redirect_uri=${encodeURIComponent("https://auth.mavo.io")}&response_type=code&scope=${encodeURIComponent(_.scopes.join(" "))}`

		static apiDomain = "https://www.googleapis.com/calendar/v3/calendars/"
		static oAuth = "https://accounts.google.com/o/oauth2/auth"
		static scopes = [
			"https://www.googleapis.com/auth/calendar.events",
			"https://www.googleapis.com/auth/userinfo.profile"
		]
		static key = "380712995757-4e9augrln1ck0soj8qgou0b4tnr30o42.apps.googleusercontent.com"
		static apiKey = "AIzaSyCiAkSCE96adO_mFItVdS9fi7CXfTiwhe4"
		static useCache = false

		// Reserved for future use (if needed)
		static defaultParams = {}

		/**
		 * Determines whether the Google Calendar backend is used.
		 * @param {string} value The mv-source/mv-init value.
		 */
		static test (value) {
			return /^https:\/\/calendar.google.com\/calendar\/?.*/.test(value);
		}
	});

	Mavo.Actions.Functions.create_event = function (...events) {
		if (!events.length || !events[0].length) {
			return;
		}

		const node = Mavo.Node.getClosest(Mavo.Functions.$evt.target);
		const mavo = node.mavo;

		mavo.source.create_event?.(...events);
	}

	Mavo.Actions.Functions.delete_event = function (...ref) {
		if (!ref.length || !ref[0]) {
			return;
		}

		const node = Mavo.Node.getClosest(Mavo.Functions.$evt.target);
		const mavo = node.mavo;

		mavo.source.delete_event?.(...ref);
	}

	Mavo.Locale.register("en", {
		"mv-gcalendar-read-permission-denied": "You don't have permission to read data from the calendar. Please, log in.",
		"mv-gcalendar-write-permission-denied": "You don't have permission to write data to the calendar.",
		"mv-gcalendar-calendar-not-found": "We couldn't find the calendar you specified.",
		"mv-gcalendar-create-event-not-authenticated": "Only authenticated users can create events. Please, log in.",
		"mv-gcalendar-delete-event-not-authenticated": "Only authenticated users can delete events. Please, log in.",
		"mv-gcalendar-event-already-deleted": "Event “{event}” has already been deleted."
	});

})(Bliss);
