# Google Calender Backend

## Setting up

1. On your computer, open [Google Calendar](https://calendar.google.com/).
1. On the left, find the _My calendars_ section. To expand it, click the _Down arrow_ button.
1. Hover over the calendar you want to share, and click _Options for &lt;Calendar Name>_ (three vertical dots) and then _Settings and sharing_.
1. On the left, find the _Integrate calendar_ section and click it.
1. On the right, copy the _Public URL to this calendar_ link.
1. Use the copied link as the value of the `mv-source` (`mv-init`) attribute in your app.

**Note:** If you want to access your _primary calendar_, simply use `https://calendar.google.com/calendar/` as the source, like so: `mv-source="https://calendar.google.com/calendar/"`. This is equivalent to `mv-source="https://calendar.google.com/calendar/embed?src=your_email"`

**Note:** To learn about other ways of sharing your calendar, you may find [this article](https://www.pcworld.com/article/394972/how-to-share-your-google-calendar-with-others.html) useful. All the calendar URLs you can get by following the steps described in the article or [Google Calendar Help](https://support.google.com/calendar/answer/37082?hl=en#zippy=%2Cunderstand-permission-settings-for-shared-calendars) are supported by the plugin. I.e., those are the allowed values of `mv-source` (`mv-init`):

- `https://calendar.google.com/calendar/`
- `https://calendar.google.com/calendar/embed?src=your_email`
- `https://calendar.google.com/calendar/u/0?cid=cDlkOWxkOXZ2aHNrOXE5M2hhcDQxN2sxZHNAZ3JvdXAuY2FsZW5kYXIuZ29vZ2xlLmNvbQ`
- `https://calendar.google.com/calendar/embed?src=p9d9ld9vvhsk9q93hap417k1ds@group.calendar.google.com`
- `https://calendar.google.com/calendar/embed?src=fr.french%23holiday%40group.v.calendar.google.com`

**Note:** The plugin supports both _public_ and _private_ calendars. However, to read data from a private calendar and work with events in it (create, update, delete), the user must be _logged in using their Google account_.

## Events

The plugin will return _a collection of events_ from the specified calendar (by default _250_ events but not more than _2500_ events).

Every event has _numerous_ properties, the most useful of which are the following:

| Property | Simple/Complex/Collection | Description |
| -------- | ----------------- | ----------- |
| `summary` | Simple | Title of the event. |
| `description` | Simple | Description of the event. |
| `location` | Simple | (Geographic) location of the event (as text). |
| `start` | Complex | The (inclusive) start time of the event. For a _recurring event_, this is the start time of the first instance. Properties: `date` (if this is an all-day event), `dateTime`, `timeZone`. |
| `end` | Complex | The (exclusive) end time of the event. For a _recurring event_, this is the end time of the first instance. Properties: `date` (if this is an all-day event), `dateTime`, `timeZone`. |
| `attendees` | Collection | The attendees of the event. Every element of the collection has the following properties: `email`, `displayName`, `responseStatus`, etc. |
| `creator` | Complex | The creator of the event with the following properties: `email`, `displayName`, etc. |
| `organizer` | Complex | The organizer of the event with the following properties: `email`, `displayName`, etc. If the organizer is also an attendee, this is indicated with a separate element in the `attendees` collection with the `organizer` property set to _true_. |
| `hangoutLink` | Simple | An absolute link to the Google Hangout associated with this event. |
| `attachments` | Collection | File attachments for the event. Every element of the collection has the following properties: `title`, `mimeType`, `fileUrl`, etc. |

**Note:** For the list of _all_ the supported properties (with description), see [the documentation](https://developers.google.com/calendar/api/v3/reference/events#resource-representations).

## Actions

The plugin supports the following custom actions:

- `create_event(text)` to create an event based on a simple text string.
- `create_event(text1, text2, ...)` to create multiple different events based on simple text strings.
- `create_event(event)` to create an event by specifying [its properties](https://developers.google.com/calendar/api/v3/reference/events#resource-representations).
- `create_event(event1, event2, ...)` to create multiple different events by specifying [their properties](https://developers.google.com/calendar/api/v3/reference/events#resource-representations).
- `update(event, values)` to update one or more events.
- `delete_event(events)` to delete the entire collection of events.
- `delete_event(event1, event2, ...)` to delete multiple different events.

**Warning:** To perform any of these actions, the user must be _logged in using their Google account_ and _have the corresponding permissions_ in the specified calendar. In other words, they are to be allowed to make changes to events in that calendar. See [Google Calendar Help](https://support.google.com/calendar/answer/37082?hl=en#zippy=%2Cunderstand-permission-settings-for-shared-calendars) for more details.

### Create events: The `create_event()` function

The parameter of the function might be the text(s) describing the event(s) to be created. E.g., `<button mv-action="create_event('Appointment at Somewhere on June 3rd 10am-10:25am')">Create Event</button>`.

The other way to create an event is by specifying its properties. The `start` and `end` complex properties are mandatory (the event won't be created if you don't specify them). In this case, you may find the [`group()`](https://mavo.io/docs/functions/#group) function useful.

For example,

```markup
<article property="event">
  <input property="summary" value="Event Title" />
  <p property="start">Start: <input type="datetime-local" property="dateTime" value="2022-06-20T12:00" /></p>
  <p property="end">End: <input type="datetime-local" property="dateTime" value="2022-06-20T13:00" /></p>
</article>
<button mv-action="create_event(event)">Create Event</button>
<button mv-action="create_event(group(start: event.start, end: event.end, summary: 'Mavo is awesome!'))">Create Event (with another title)</button>
```

If you provide multiple values, you will get multiple new events. E.g., `<button mv-action="create_event(group(start: event.start, end: event.end), 'Appointment #1 at Somewhere on July 3rd 10am-10:25am')">Create Two Events</button>`.

### Update event: The `update_event()` function

You can update events with the `update_event()` function. The first argument is the event(s) you want to update, and the second is the new value(s) of some (or all) of its properties (fields). The field values you specify replace the existing values. Note that you can use this to update multiple events at once.

To specify new field values for the event(s), use the [`group()`](https://mavo.io/docs/functions/#group) function.

E.g., `<button mv-action="update_event(last(2, events), group(summary: 'Mavo is awesome!'))">Update two last events</button>`.

**Warning:** You can't undo the event update.

### Delete events: The `delete_event()` function

The parameter of the function is the event(s) to delete. This could be an entire collection, or specific items.

E.g., after clicking the `<button mv-action="delete_event(events where starts(summary, 'Appointment'))">Delete Event</button>` button the events which `summary` property starts with “Appointment” will be deleted.

Especially with the `delete_event()` function, you may find the [`where`](https://mavo.io/docs/functions/#where) operator useful.

**Warning:** You can't undo event deletion.

## Customization

The plugin supports a number of options for customizing the way it reads data from a calendar. You can specify these options by using the `mv-source-options` (`mv-init-options`) attribute. To separate the options, you can use either commas or semicolons.

E.g., by specifying `mv-source-options="singleEvents, q: birthday, orderBy: startTime, maxResults: 15"` you will get not more than 15 events ordered by the start time that have text “birthday” in either of the following properties: `summary`, `description`, `location`, attendee's `displayName`, attendee's `email`. All recurring events will be expanded into instances (recurring events themselves won't be returned).

**Warning:** You can use `orderBy: startTime` **only** with the `singleEvents` option together.

For more information, see the [Optional query parameters](https://developers.google.com/calendar/api/v3/reference/events/list?hl=en_US#parameters) section of the documentation.

### Supported values of the `mv-source-*` (`mv-init-*`) family of attributes

| Value | Description |
| ----- | ----------- |
| `calendar` | (_Optional_) Calendar ID. |

### Localization strings

| id | Value |
| ----- | ----------- |
| `mv-gcalendar-read-permission-denied` | You don't have permission to read data from the calendar. Please, log in. |
| `mv-gcalendar-write-permission-denied` | You don't have permission to write data to the calendar. |
| `mv-gcalendar-calendar-not-found` | We couldn't find the calendar you specified. |
| `mv-gcalendar-event-not-found` | We couldn't find the event you specified. |
| `mv-gcalendar-create-event-not-authenticated` | Only authenticated users can create events. Please, log in. |
| `mv-gcalendar-create-event-no-start-or-end` | We couldn't create the event since it lacks required data: the start and/or the end time of the event. |
| `mv-gcalendar-create-event-bad-data` | We couldn't create the event since you provided incorrect data. |
| `mv-gcalendar-delete-event-not-authenticated` | Only authenticated users can delete events. Please, log in. |
| `mv-gcalendar-event-already-deleted` | Event “{event}” has already been deleted. |
| `mv-gcalendar-delete-not-existing-event` | The parameter of delete_event() needs to be an existing event, {event} is not. |
| `mv-gcalendar-update-event-not-authenticated` | Only authenticated users can update events. Please, log in. |
| `mv-gcalendar-update-not-existing-event` | The first parameter of update_event() needs to be one or more existing events, {event} is not. |
| `mv-gcalendar-update-event-bad-data` | We couldn't update the event since you provided incorrect data. |
| `mv-gcalendar-creating-event` | Creating event |
| `mv-gcalendar-updating-event` | Updating event |
| `mv-gcalendar-deleting-event` | Deleting event |

## Demo

```markup
<section mv-app="holidays" mv-source="https://calendar.google.com/calendar/embed?src=fr.french%23holiday%40group.v.calendar.google.com" mv-source-options="maxResults: 5" mv-plugins="gcalendar">
  <h2>Jours Fériés en France</h2>
  <ul mv-list="events">
   <li mv-list-item>
    <h3 property="summary"></h3>
    <p property="start">
     La date: <time property="date"></time>
    </p>
   </li>
  </ul>
</section>

<section mv-app="mavo_events" mv-source="https://calendar.google.com/calendar/u/0?cid=cDlkOWxkOXZ2aHNrOXE5M2hhcDQxN2sxZHNAZ3JvdXAuY2FsZW5kYXIuZ29vZ2xlLmNvbQ" mv-source-options="singleEvents, orderBy: startTime" mv-plugins="gcalendar">
  <h2>Mavo Events</h2>
  <ul mv-list="events">
   <li mv-list-item>
    <h3 property="summary"></h3>
    <p property="start">
      Date: <time property="dateTime"></time><time property="date"></time>
    </p>
    <p property="description"></p>
   </li>
  </ul>

  <h2>Give the actions a try!</h2>
  <article property="event">
    <input property="summary" value="Event Title" />
    <p property="start">Start: <input type="datetime-local" property="dateTime" value="2022-06-20T12:00" /></p>
    <p property="end">End: <input type="datetime-local" property="dateTime" value="2022-06-20T13:00" /></p>
  </article>

  <button mv-action="create_event('Appointment #1 at Somewhere on July 3rd 10am-10:25am')">Create Event</button>
  <button mv-action="create_event(event)">Create Event</button>
  <button mv-action="create_event(group(start: event.start, end: event.end, summary: 'Mavo is awesome!'))">Create Event (with another title)</button>
  <button mv-action="create_event(group(start: event.start, end: event.end), 'Appointment #1 at Somewhere on July 3rd 10am-10:25am')">Create Two Events</button>

  <button mv-action="delete_event(events where starts(summary, 'Appointment'))">Delete events whose title starts with “Appointment”</button>
  <button mv-action="delete_event(last(events))">Delete Last Event</button>

  <button mv-action="update_event(last(events), group(summary: 'New Title!'))">Update Last Event</button>
  <button mv-action="update_event(last(2, events), group(summary: 'New Title!'))">Update Two Last Events</button>
  <button mv-action="update_event(events, group(summary: 'Mavo is Awesome!'))">Update All Events</button>
</section>
```
