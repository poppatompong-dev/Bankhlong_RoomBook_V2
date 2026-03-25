// Google Calendar Integration Service
// Gracefully degrades when credentials are not configured

class GoogleCalendarService {
  constructor() {
    this.enabled = !!(
      process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REFRESH_TOKEN
    );
    this.auth = null;
    this.calendar = null;

    if (this.enabled) {
      try {
        const { google } = require('googleapis');
        this.auth = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET,
          process.env.GOOGLE_REDIRECT_URI
        );
        this.auth.setCredentials({
          refresh_token: process.env.GOOGLE_REFRESH_TOKEN
        });
        this.calendar = google.calendar({ version: 'v3', auth: this.auth });
        console.log('📅 Google Calendar: Connected');
      } catch (error) {
        console.log('📅 Google Calendar: Failed to initialize -', error.message);
        this.enabled = false;
      }
    } else {
      console.log('📅 Google Calendar: Running in simulated mode (no credentials)');
    }
  }

  async createEvent(booking, room, user) {
    if (!this.enabled) {
      const fakeId = `sim_${Date.now()}`;
      console.log(`📅 [Simulated] Created calendar event: ${fakeId}`);
      return { eventId: fakeId, simulated: true };
    }

    try {
      const [year, month, day] = booking.date.split('-');
      const startDateTime = `${booking.date}T${booking.startTime}:00+07:00`;
      const endDateTime = `${booking.date}T${booking.endTime}:00+07:00`;

      const event = {
        summary: `🏢 ${room.name} - ${booking.purpose}`,
        description: `ผู้จอง: ${user.name}\nเบอร์โทร: ${user.phone || '-'}\nวัตถุประสงค์: ${booking.purpose}`,
        start: { dateTime: startDateTime, timeZone: 'Asia/Bangkok' },
        end: { dateTime: endDateTime, timeZone: 'Asia/Bangkok' },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 15 },
            { method: 'email', minutes: 30 }
          ]
        }
      };

      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        resource: event
      });

      console.log(`📅 Created calendar event: ${response.data.id}`);
      return { eventId: response.data.id, simulated: false };
    } catch (error) {
      console.error('📅 Error creating calendar event:', error.message);
      return { eventId: null, error: error.message };
    }
  }

  async deleteEvent(eventId) {
    if (!this.enabled || !eventId || eventId.startsWith('sim_')) {
      console.log(`📅 [Simulated] Deleted calendar event: ${eventId}`);
      return { success: true, simulated: true };
    }

    try {
      await this.calendar.events.delete({
        calendarId: 'primary',
        eventId: eventId
      });
      console.log(`📅 Deleted calendar event: ${eventId}`);
      return { success: true, simulated: false };
    } catch (error) {
      console.error('📅 Error deleting calendar event:', error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new GoogleCalendarService();
