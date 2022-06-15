# Google Calender Backend

**Note:** Please keep in mind that **the plugin only allows you to read events from the calendar** and not create and/or update them. It might change in the future. So stay tuned! 😉

## Setting up

1. On your computer, open [Google Calendar](https://calendar.google.com/).
1. On the left, find the _My calendars_ section. To expand it, click the _Down arrow_ button.
1. Hover over the calendar you want to share, and click _Options for &lt;Calendar Name>_ (three vertical dots) and then _Settings and sharing_.
1. On the left, find the _Integrate calendar_ section and click it.
1. On the right, copy the _Public URL to this calendar_ link.
1. Use the copied link as the value of the `mv-source` (`mv-init`) attribute in your app.

**Note:** If you want to access your primary calendar, simply use `https://calendar.google.com/calendar/` as the source, like so: `mv-source="https://calendar.google.com/calendar/"`.

**Note:** The plugin supports both _public_ and _private_ calendars. However, to read data from a private calendar, you need to be logged in.

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

## Customization

The plugin supports a number of options for customizing the way it reads data from a calendar. You can specify these options by using the `mv-source-options` (`mv-init-options`) attribute. To separate the options, you can use either commas or semicolons.

E.g., by specifying `mv-source-options="singleEvents, q: birthday, orderBy: startTime, maxResults: 15"` you will get not more than 15 events ordered by the start time that have text “birthday” in either of the following properties: `summary`, `description`, `location`, attendee's `displayName`, attendee's `email`. All recurring events will be expanded into instances (recurring events themselves won't be returned).

**Warning:** You can use `orderBy: startTime` **only** with the `singleEvent` option together.

For more information, see the [Optional query parameters](https://developers.google.com/calendar/api/v3/reference/events/list?hl=en_US#parameters) section of the documentation.

### Supported values of the `mv-source-*` (`mv-init-*`) family of attributes

| Value | Description |
| ----- | ----------- |
| `calendar` | (_Optional_) Calendar ID. |

### Localization strings

| id | Value |
| ----- | ----------- |
| `mv-gcalendar-read-permission-denied` | You don't have permission to read data from the calendar. Please, log in. |
| `mv-gcalendar-calendar-not-found` | We couldn't find the calendar you specified. |

## Demo

```markup
<main mv-app="holidays" mv-source="https://calendar.google.com/calendar/embed?src=fr.french%23holiday%40group.v.calendar.google.com">
  <h1>Jours Fériés en France</h1>
  <ul mv-list="events">
   <li mv-list-item>
    <h2 property="summary"></h2>
    <p property="start">
     La date: <time property="date"></time>
    </p>
   </li>
  </ul>
</main>
```
