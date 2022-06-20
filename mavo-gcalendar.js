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

			if (params.has("cid")) {
				// Use atob() from the Github backend since we might need to handle Unicode.
				this.calendar = Mavo.Backend.Github.atob(params.get("cid"));
			}

			// Order matters: calendar ID, shareable link, public URL, or the user's primary calendar.
			this.calendar = o.calendar ?? this.calendar ?? params.get("src") ?? "primary";
			this.calendar = encodeURIComponent(this.calendar);

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
				response = await fetch(this.apiURL({ withCredentials: false }));
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

			const baseURL = this.apiURL({ action: "CREATE" });

			this.mavo.inProgress = this.mavo._("mv-gcalendar-creating-event");

			for (let event of events) {
				if (!((event.start?.date || event.start?.dateTime) && (event.end?.date || event.end?.dateTime))) {
					this.mavo.error(this.mavo._("mv-gcalendar-create-event-no-start-or-end"));
					continue;
				}

				event = _.fixDates(event);

				const response = await fetch(baseURL, {
					method: "POST",
					headers: {
						Authorization: `Bearer ${this.accessToken}`,
						"Content-Type": "application/json; charset=UTF-8"
					},
					body: JSON.stringify(event)
				});

				if (!response.ok) {
					const error = (await response.json()).error.message;

					switch (response.status) {
						case 400:
							// Bad data
							this.mavo.error(this.mavo._("mv-gcalendar-create-event-bad-data"));
							Mavo.warn(`${this.mavo._("mv-gcalendar-create-event-bad-data")}\nData was:\n${Mavo.toJSON(event)}`)
							break;
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

			this.mavo.inProgress = false;
		}

		async quick_create_event (...texts) {
			if (!this.isAuthenticated()) {
				this.mavo.error(this.mavo._("mv-gcalendar-create-event-not-authenticated"));
				return;
			}

			const baseURL = this.apiURL({ action: "QUICK_CREATE" });

			this.mavo.inProgress = this.mavo._("mv-gcalendar-creating-event");

			for (const text of texts) {
				const url = baseURL + encodeURIComponent(text);
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

			this.mavo.inProgress = false;
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

			const baseURL = this.apiURL({ action: "DELETE" });

			this.mavo.inProgress = this.mavo._("mv-gcalendar-deleting-event");

			for (const event of events) {
				if (event.kind !== "calendar#event") {
					Mavo.warn(this.mavo._("mv-gcalendar-delete-not-existing-event", { event }));
					continue;
				}

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
						case 404:
							// No event
							this.mavo.error(this.mavo._("mv-gcalendar-event-not-found"));
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

			this.mavo.inProgress = false;
		}

		async update_event (ref, values) {
			if (!this.isAuthenticated()) {
				this.mavo.error(this.mavo._("mv-gcalendar-update-event-not-authenticated"));
				return;
			}

			const baseURL = this.apiURL({ action: "UPDATE" });

			const wasArray = Array.isArray(ref);
			const nodes = [];
			for (const node of Mavo.Actions.getNodes(ref)) {
				if (node instanceof Mavo.Collection) {
					nodes.push(...node.children)
				}
				else {
					nodes.push(node);
				}
			}

			if (!nodes.length) {
				Mavo.warn(this.mavo._("mv-gcalendar-update-not-existing-event", { ref: Mavo.safeToJSON(ref) }));
			}
			else {
				this.mavo.inProgress = this.mavo._("mv-gcalendar-updating-event");

				let result = Mavo.Script.binaryOperation(wasArray? nodes : nodes[0], values, {
					scalar: async (node, value) => {
						if (!node || !value) {
							return null;
						}

						const event = node.getData();
						if (event.kind !== "calendar#event") {
							Mavo.warn(this.mavo._("mv-gcalendar-update-not-existing-event", { event }));
							return null;
						}

						const url = baseURL + event.id;
						value = _.fixDates(value);
						const response = await fetch(url, {
							method: "PATCH",
							headers: {
								Authorization: `Bearer ${this.accessToken}`,
								"Content-type": "application/json; charset=UTF-8"
							},
							body: JSON.stringify(value)
						});

						if (!response.ok) {
							const error = (await response.json()).error.message;

							switch (response.status) {
								case 400:
									// Bad data
									this.mavo.error(this.mavo._("mv-gcalendar-update-event-bad-data"));
									Mavo.warn(`${this.mavo._("mv-gcalendar-update-event-bad-data")}\nData was:\n${Mavo.toJSON(value)}`);
									break;
								case 403:
									// No write permissions
									this.mavo.error(this.mavo._("mv-gcalendar-write-permission-denied"));
									break;
								case 404:
									// No event
									this.mavo.error(this.mavo._("mv-gcalendar-event-not-found"));
									break;
								default:
									Mavo.warn(error);
							}
						}

						return Promise.resolve(response);
					}
				});

				result = Array.isArray(result)? result : [result];
				await Promise.allSettled(result);

				const data = await this.load();
				if (Mavo.prototype.push) {
					$.fire(this, "mv-remotedatachange", { data });
				}
				else {
					// Mavo v0.2.4-
					this.mavo.render(data);
				}

				this.mavo.inProgress = false;
			}
		}

		apiURL ({ action = "GET", withCredentials = true } = {}) {
			switch (action) {
				case "GET":
					const params = { ..._.defaultParams, ...this.searchParams };

					const searchParams = new URLSearchParams();
					for (const [key, value] of Object.entries(params)) {
						searchParams.set(key, value);
					}

					if (!withCredentials) {
						searchParams.set("key", _.apiKey)
					}

					return _.apiDomain + this.calendar + "/events?" + searchParams;
				case "QUICK_CREATE":
					return _.apiDomain + this.calendar + "/events/quickAdd?text=";
				case "CREATE":
				case "UPDATE":
				case "DELETE":
					return _.apiDomain + this.calendar + "/events/";
			}
		}

		static fixDates (event) {
			// Convert date-time to ISO string
			if (event.start?.dateTime) {
				event.start.dateTime = new Date(event.start.dateTime)?.toISOString();
			}

			if (event.end?.dateTime) {
				event.end.dateTime = new Date(event.end.dateTime)?.toISOString();
			}

			if (event.originalStartTime?.dateTime) {
				event.originalStartTime.dateTime = new Date(event.originalStartTime.dateTime)?.toISOString();
			}

			return event;
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

	Mavo.Actions.Functions.create_event = async function (...ref) {
		if (!ref.length) {
			return;
		}

		const texts = [];
		const events = [];

		for (const r of ref) {
			if (typeof r === "string") {
				texts.push(r);
			}
			else if (Mavo.Actions.getNodes(r).length) {
				const nodes = [];
				for (const node of Mavo.Actions.getNodes(r)) {
					if (node instanceof Mavo.Collection) {
						nodes.push(...node.children);
					} else {
						nodes.push(node);
					}
				}

				for (const node of nodes) {
					events.push(node.getData());
				}
			}
			else {
				events.push(JSON.parse(Mavo.toJSON(r)));
			}
		}

		const mavo = getMavo(Mavo.Functions.$evt.target);
		if (texts.length) {
			await mavo.source.quick_create_event?.(...texts);
		}

		if (events.length) {
			await mavo.source.create_event?.(...events);
		}
	}

	Mavo.Actions.Functions.delete_event = function (...ref) {
		if (!ref.length || !ref[0]) {
			return;
		}

		const mavo = getMavo(Mavo.Functions.$evt.target);
		mavo.source.delete_event?.(...ref);
	}

	Mavo.Actions.Functions.update_event = function (ref, values) {
		if (!ref) {
			return;
		}

		const mavo = getMavo(Mavo.Functions.$evt.target);
		mavo.source.update_event?.(ref, values);
	}

	Mavo.Locale.register("en", {
		"mv-gcalendar-read-permission-denied": "You don't have permission to read data from the calendar. Please, log in.",
		"mv-gcalendar-write-permission-denied": "You don't have permission to write data to the calendar.",
		"mv-gcalendar-calendar-not-found": "We couldn't find the calendar you specified.",
		"mv-gcalendar-event-not-found": "We couldn't find the event you specified.",
		"mv-gcalendar-create-event-not-authenticated": "Only authenticated users can create events. Please, log in.",
		"mv-gcalendar-create-event-no-start-or-end": "We couldn't create the event since it lacks required data: the start and/or the end time of the event.",
		"mv-gcalendar-create-event-bad-data": "We couldn't create the event since you provided incorrect data.",
		"mv-gcalendar-delete-event-not-authenticated": "Only authenticated users can delete events. Please, log in.",
		"mv-gcalendar-event-already-deleted": "Event “{event}” has already been deleted.",
		"mv-gcalendar-delete-not-existing-event": "The parameter of delete_event() needs to be an existing event, {event} is not.",
		"mv-gcalendar-update-event-not-authenticated": "Only authenticated users can update events. Please, log in.",
		"mv-gcalendar-update-not-existing-event": "The first parameter of update_event() needs to be one or more existing events, {event} is not.",
		"mv-gcalendar-update-event-bad-data": "We couldn't update the event since you provided incorrect data.",
		"mv-gcalendar-creating-event": "Creating event",
		"mv-gcalendar-updating-event": "Updating event",
		"mv-gcalendar-deleting-event": "Deleting event"
	});

	function getMavo (node) {
		node = Mavo.Node.getClosest(node);

		return node.mavo;
	}
})(Bliss);
