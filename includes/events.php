<?php

/**
 * Powers individuals events.
 *
 * Class Conference_Schedule_Event
 */
class Conference_Schedule_Event {

	/**
	 * Will hold the event's
	 * post ID if a valid event.
	 *
	 * @since   1.0.0
	 * @access  private
	 * @var     int
	 */
	private $ID;

	/**
	 * Will hold the event' post data.
	 *
	 * @since   1.0.0
	 * @access  private
	 * @var     WP_Post
	 */
	private $post;

	/**
	 * Will hold the event parent ID.
	 *
	 * @since   1.0.0
	 * @access  private
	 * @var     int
	 */
	private $parent;

	/**
	 * Will hold the event date.
	 *
	 * @since   1.0.0
	 * @access  private
	 * @var     string
	 */
	private $date;

	/**
	 * Will hold the event date/time.
	 *
	 * @since   1.0.0
	 * @access  private
	 * @var     string
	 */
	private $date_time;

	/**
	 * Will hold the event date/time in GMT.
	 *
	 * @since   1.0.0
	 * @access  private
	 * @var     string
	 */
	private $date_time_gmt;

	/**
	 * Will hold the event start time.
	 *
	 * @since   1.0.0
	 * @access  private
	 * @var     string
	 */
	private $start_time;

	/**
	 * Will hold the event end time.
	 *
	 * @since   1.0.0
	 * @access  private
	 * @var     string
	 */
	private $end_time;

	/**
	 * Will hold the event date display.
	 *
	 * @since   1.0.0
	 * @access  private
	 * @var     string
	 */
	private $date_display;

	/**
	 * Will hold the event time display.
	 *
	 * @since   1.0.0
	 * @access  private
	 * @var     string
	 */
	private $time_display;

	/**
	 * Will hold the event location ID.
	 *
	 * @since   1.0.0
	 * @access  private
	 * @var     int
	 */
	private $location_id;

	/**
	 * Will hold the event location.
	 *
	 * @since   1.0.0
	 * @access  private
	 * @var     string
	 */
	private $location;

	/**
	 * Will hold the event location address.
	 *
	 * @since   1.0.0
	 * @access  private
	 * @var     string
	 */
	private $location_address;

	/**
	 * Will hold the event's location's
	 * Google Maps URL.
	 *
	 * @since   1.0.0
	 * @access  private
	 * @var     string
	 */
	private $google_maps_url;

	/**
	 * Will hold the event's hashtag.
	 *
	 * @since   1.0.0
	 * @access  private
	 * @var     string
	 */
	private $hashtag;

	/**
	 * Will hold the event's speakers.
	 *
	 * @since   1.0.0
	 * @access  private
	 * @var     array
	 */
	private $speakers;

	/**
	 * Will hold the event's livestream URL.
	 *
	 * @since   1.0.0
	 * @access  private
	 * @var     string
	 */
	private $livestream_url;

	/**
	 * Will hold the event's slides URL.
	 *
	 * @since   1.0.0
	 * @access  private
	 * @var     string
	 */
	private $slides_url;

	/**
	 * Will hold the event's follow up URL.
	 *
	 * @since   1.0.0
	 * @access  private
	 * @var     string
	 */
	private $follow_up_url;

	/**
	 * Will hold the event's video URL.
	 *
	 * @since   1.0.0
	 * @access  private
	 * @var     string
	 */
	private $video_url;

	/**
	 * Will hold the event's feedback URL.
	 *
	 * @since   1.0.0
	 * @access  private
	 * @var     string
	 */
	private $feedback_url;

	/**
	 * Did we just construct something?
	 *
	 * @access  public
	 * @since   1.0.0
	 * @param   $post_id - the event post ID
	 */
	public function __construct( $post_id ) {

		// Get the post data
		$this->post = get_post( $post_id );

		// Store the ID
		if ( ! empty( $this->post->ID ) ) {
			$this->ID = $this->post->ID;
		}
	}

	/**
	 * Get the event parent.
	 */
	public function get_parent() {

		// Make sure we have an ID
		if ( ! ( $this->ID >= 1 ) ) {
			return false;
		}

		// If already set, return the parent
		if ( isset( $this->parent ) ) {
			return $this->parent;
		}

		$this->parent = get_post_field( 'post_parent', $this->ID );

		return $this->parent;
	}

	/**
	 * Get the event date.
	 */
	public function get_date() {

		// Make sure we have an ID
		if ( ! ( $this->ID >= 1 ) ) {
			return false;
		}

		// If already set, return the date
		if ( isset( $this->date ) ) {
			return $this->date;
		}

		$this->date = get_post_meta( $this->ID, 'conf_sch_event_date', true );

		return $this->date;
	}

	/**
	 * Get the event date/time.
	 */
	public function get_date_time() {

		// Make sure we have an ID.
		if ( ! ( $this->ID >= 1 ) ) {
			return false;
		}

		// If already set, return the date.
		if ( isset( $this->date_time ) ) {
			return $this->date_time;
		}

		// Get the event date.
		$event_date = $this->get_date();

		// If we have an event date, get the start date.
		if ( ! empty( $event_date ) ) {

			// Get the start time.
			$event_start_time = $this->get_start_time();

			// If we have a start time, add to date.
			if ( ! empty( $event_start_time ) ) {
				$event_date .= 'T' . $event_start_time;
			}
		}

		$this->date_time = ! empty( $event_date ) ? $event_date : false;

		return $this->date_time;
	}

	/**
	 * Get the event date in GMT.
	 */
	public function get_date_time_gmt() {

		// Make sure we have an ID
		if ( ! ( $this->ID >= 1 ) ) {
			return false;
		}

		// If already set, return the date
		if ( isset( $this->date_time_gmt ) ) {
			return $this->date_time_gmt;
		}

		// Get the event date/time
		$event_date_time = $this->get_date_time();

		// If we have a date...
		if ( ! empty( $event_date_time ) ) {

			// Get this site's timezone.
			$timezone = conference_schedule()->get_site_timezone();

			// Store in date object
			$date_time = new DateTime( $event_date_time, new DateTimeZone( $timezone ) );

			// Convert to UTC/GMT
			$utc_timezone = new DateTimeZone( 'UTC' );
			$date_time->setTimezone( $utc_timezone );

			// Store GMT
			$this->date_time_gmt = $date_time->format( 'Y-m-d\TH:i' );

			return $this->date_time_gmt;
		}

		$this->date_time_gmt = false;

		return $this->date_time_gmt;
	}

	/**
	 * Get the event start time.
	 */
	public function get_start_time() {

		// Make sure we have an ID
		if ( ! ( $this->ID >= 1 ) ) {
			return false;
		}

		// If already set, return the start time
		if ( isset( $this->start_time ) ) {
			return $this->start_time;
		}

		$this->start_time = get_post_meta( $this->ID, 'conf_sch_event_start_time', true );

		return $this->start_time;
	}

	/**
	 * Get the event end time.
	 */
	public function get_end_time() {

		// Make sure we have an ID
		if ( ! ( $this->ID >= 1 ) ) {
			return false;
		}

		// If already set, return the end time
		if ( isset( $this->end_time ) ) {
			return $this->end_time;
		}

		$this->end_time = get_post_meta( $this->ID, 'conf_sch_event_end_time', true );

		return $this->end_time;
	}

	/**
	 * Get the event date display.
	 */
	public function get_date_display() {

		// Make sure we have an ID
		if ( ! ( $this->ID >= 1 ) ) {
			return false;
		}

		// If already set, return the display
		if ( isset( $this->date_display ) ) {
			return $this->date_display;
		}

		// Get the event date
		$event_date = $this->get_date();

		// Store and format the date display.
		$this->date_display = ! empty( $event_date ) ? date( 'l, F j, Y', strtotime( $event_date ) ) : false;

		return $this->date_display;
	}

	/**
	 * Get the event time display.
	 */
	public function get_time_display() {

		// Make sure we have an ID
		if ( ! ( $this->ID >= 1 ) ) {
			return false;
		}

		// If already set, return the display
		if ( isset( $this->time_display ) ) {
			return $this->time_display;
		}

		// Get the start time
		$event_start_time = $this->get_start_time();

		// Get the end time
		$event_end_time = $this->get_end_time();

		// Only proceed if we have a start time
		if ( ! $event_start_time ) {
			$this->time_display = false;
			return $this->time_display;
		}

		// Convert start time
		$event_start_time = strtotime( $event_start_time );

		// Build the display string, starting with start time
		$time_display = date( 'g:i', $event_start_time );

		// Display the end time.
		if ( ! $event_end_time ) {
			$time_display .= date( ' a', $event_start_time );
		} else {

			// Convert end time
			$event_end_time = strtotime( $event_end_time );

			// Figure out if the meridian is different
			if ( date( 'a', $event_start_time ) != date( 'a', $event_end_time ) ) {
				$time_display .= date( ' a', $event_start_time );
			}

			$time_display .= ' - ' . date( 'g:i a', $event_end_time );

		}

		// Store the time display, and change "am" and "pm" to "a.m." and "p.m.".
		$this->time_display = preg_replace( '/(a|p)m/', '$1.m.', $time_display );

		return $this->time_display;
	}

	/**
	 * Get the event duration.
	 */
	public function get_duration() {

		// Make sure we have an ID
		if ( ! ( $this->ID >= 1 ) ) {
			return false;
		}

		// If already set, return the duration
		if ( isset( $this->duration ) ) {
			return $this->duration;
		}

		// Get the start time
		$event_start_time = $this->get_start_time();

		// Get the end time
		$event_end_time = $this->get_end_time();

		// Only proceed if we have a start and end time
		if ( ! $event_start_time || ! $event_end_time ) {
			$this->duration = false;
			return $this->duration;
		}

		// Convert start time
		$event_start_time = strtotime( $event_start_time );

		// Convert end time
		$event_end_time = strtotime( $event_end_time );

		// Set the duration.
		$this->duration = ( $event_end_time - $event_start_time );

		return $this->duration;
	}

	public function get_location_id() {

		// Make sure we have an ID.
		if ( ! ( $this->ID >= 1 ) ) {
			return false;
		}

		// If already set, return the location ID.
		if ( isset( $this->location_id ) ) {
			return $this->location_id;
		}

		// Get the event location ID.
		$location_id = get_post_meta( $this->ID, 'conf_sch_event_location', true );

		$this->location_id = ( $location_id >= 1 ) ? $location_id : 0;

		return $this->location_id;
	}

	/**
	 * Get the event location.
	 */
	public function get_location() {

		// Make sure we have an ID.
		if ( ! ( $this->ID >= 1 ) ) {
			return false;
		}

		// If already set, return the location.
		if ( isset( $this->location ) ) {
			return $this->location;
		}

		// Get the event location ID.
		$location_id = $this->get_location_id();
		if ( $location_id > 0 ) {

			// Get the location post.
			$event_post = get_post( $location_id );
			if ( ! empty( $event_post ) ) {
				$this->location = $event_post;
				return $this->location;
			}
		}

		$this->location = false;

		return $this->location;
	}

	/**
	 * Get the event location address.
	 */
	public function get_location_address() {

		// Make sure we have an ID
		if ( ! ( $this->ID >= 1 ) ) {
			return false;
		}

		// If already set, return the location address
		if ( isset( $this->location_address ) ) {
			return $this->location_address;
		}

		// Get the location ID
		$location_id = $this->get_location_id();
		if ( $location_id > 0 ) {
			$conf_sch_location_address = get_post_meta( $location_id, 'conf_sch_location_address', true );
			$this->location_address    = ! empty( $conf_sch_location_address ) ? $conf_sch_location_address : false;
			return $this->location_address;
		}

		$this->location_address = false;

		return $this->location_address;
	}

	/**
	 * Get the event's location's Google Maps URL
	 */
	public function get_google_maps_url() {

		// Make sure we have an ID
		if ( ! ( $this->ID >= 1 ) ) {
			return false;
		}

		// If already set, return the URL
		if ( isset( $this->google_maps_url ) ) {
			return $this->google_maps_url;
		}

		// Get the event location ID
		$event_location_id = $this->get_location_id();
		if ( $event_location_id > 0 ) {

			// Get Google Maps URL for this event location
			$google_maps_url = get_post_meta( $event_location_id, 'conf_sch_location_google_maps_url', true );
			if ( ! empty( $google_maps_url ) ) {
				$this->google_maps_url = $google_maps_url;
				return $this->google_maps_url;
			}
		}

		$this->google_maps_url = false;

		return $this->google_maps_url;
	}

	/**
	 * Get the event's hashtag.
	 */
	public function get_hashtag() {

		// Make sure we have an ID.
		if ( ! ( $this->ID >= 1 ) ) {
			return false;
		}

		// If already set, return the hashtag.
		if ( isset( $this->hashtag ) ) {
			return $this->hashtag;
		}

		// Get the event hashtag.
		$event_hashtag = get_post_meta( $this->ID, 'conf_sch_event_hashtag', true );

		$this->hashtag = ! empty( $event_hashtag ) ? $event_hashtag : false;

		return $this->hashtag;
	}

	/**
	 * Get the event's speakers.
	 *
	 * @TODO: Update to work with new system.
	 */
	public function get_speakers() {

		// Make sure we have an ID.
		if ( ! $this->ID ) {
			return array();
		}

		// If already set, return the speakers.
		if ( isset( $this->speakers ) ) {
			return $this->speakers;
		}

		// Will hold speakers
		$speakers = array();

		/*// Get speaker IDs.
		$event_speaker_ids = get_post_meta( $this->ID, 'conf_sch_event_speaker', false );
		if ( ! empty( $event_speaker_ids ) ) {

			// Get speakers info.
			foreach ( $event_speaker_ids as $speaker_id ) {
				if ( $speaker_post = get_post( $speaker_id ) ) {

					*//*
					 * Add twitter.
					 *
					 * @TODO:
					 * Should this be a setting or added elsewhere?
					 *//*
					$speaker_post->twitter = get_post_meta( $speaker_id, 'conf_sch_speaker_twitter', true );

					$speakers[] = $speaker_post;
				}
			}
		}*/

		$this->speakers = ! empty( $speakers ) ? $speakers : false;

		return $this->speakers;
	}

	/**
	 * Get the event's livestream URL.
	 *
	 * @return string|false|null
	 *  If event is active (and within livestream range):
	 *      - Will return URL if exists
	 *      - Otherwise will return null.
	 *  If event isn't active:
	 *      - Will return false.
	 */
	public function get_livestream_url() {

		// Make sure we have an ID.
		if ( ! ( $this->ID >= 1 ) ) {
			return false;
		}

		// If already set, return the URL.
		if ( isset( $this->livestream_url ) ) {
			return $this->livestream_url;
		}

		// See if the livestream is disabled for this event.
		$livestream_disabled = get_post_meta( $this->ID, 'conf_sch_event_livestream_disable', true );
		if ( isset( $livestream_disabled ) && $livestream_disabled ) {
			return false;
		}

		// Get our enabled session fields.
		$session_fields = conference_schedule()->get_session_fields();

		// Make sure livestream is enabled.
		if ( empty( $session_fields ) || ! in_array( 'livestream', $session_fields ) ) {
			$this->livestream_url = false;
			return $this->livestream_url;
		}

		// What time is it in UTC?
		$current_time = new DateTime( 'now', new DateTimeZone( 'UTC' ) );

		// Get date/time in UTC. Get out of here if time isn't valid.
		$session_date_time_gmt = $this->get_date_time_gmt();
		if ( empty( $session_date_time_gmt ) || strtotime( $session_date_time_gmt ) === false ) {
			return false;
		}

		/*
		 * Will show up 15 minutes before start.
		 * @TODO add setting to control.
		 */
		$session_livestream_reveal_delay_seconds = 900;

		// Build session start date time.
		$event_start_dt = new DateTime( $session_date_time_gmt, new DateTimeZone( 'UTC' ) );

		// This means the event is active and after the beginning of the livestream range.
		if ( ( $event_start_dt->getTimestamp() - $current_time->getTimestamp() ) <= $session_livestream_reveal_delay_seconds ) {

			// Get the duration.
			$event_duration = $this->get_duration();

			// Remove when the event ends.
			if ( $current_time->getTimestamp() > ( $event_start_dt->getTimestamp() + $event_duration ) ) {
				$this->livestream_url = false;
				return $this->livestream_url;
			}

			// Get the livestream URL.
			$livestream_url = get_post_meta( $this->ID, 'conf_sch_event_livestream_url', true );

			// Filter the livestream URL.
			$livestream_url = apply_filters( 'conf_sch_livestream_url', $livestream_url, $this->post );

			// Return the URL.
			if ( ! empty( $livestream_url ) ) {
				$this->livestream_url = $livestream_url;
				return $this->livestream_url;
			}

			/*
			 * Set as null if event is active but no URL.
			 *
			 * @TODO this could be a problem for schedule
			 * items that aren't sessions, like "Lunch".
			 */
			$this->livestream_url = null;
			return $this->livestream_url;
		}

		// This means the event is not active and not within the range.
		$this->livestream_url = false;

		return $this->livestream_url;
	}

	/**
	 * Get the event's slides URL.
	 */
	public function get_slides_url() {

		// Make sure we have an ID
		if ( ! ( $this->ID >= 1 ) ) {
			return false;
		}

		// If already set, return the URL
		if ( isset( $this->slides_url ) ) {
			return $this->slides_url;
		}

		// Get our enabled session fields
		$session_fields = conference_schedule()->get_session_fields();

		// Are slides enabled?
		if ( empty( $session_fields ) || ! in_array( 'slides', $session_fields ) ) {
			$this->slides_url = false;
			return $this->slides_url;
		}

		// The URL takes priority when a URL and file is provided
		$slides_url = get_post_meta( $this->ID, 'conf_sch_event_slides_url', true );

		// Filter the slides URL
		$slides_url = apply_filters( 'conf_sch_slides_url', $slides_url, $this->post );

		// If we have a URL...
		if ( ! empty( $slides_url ) ) {
			$this->slides_url = $slides_url;
			return $this->slides_url;
		}

		// Get the file
		$slides_file_id = get_post_meta( $this->ID, 'conf_sch_event_slides_file', true );
		if ( $slides_file_id > 0 ) {
			$slides_file_url  = wp_get_attachment_url( $slides_file_id );
			$this->slides_url = ! empty( $slides_file_url ) ? $slides_file_url : false;
			return $this->slides_url;
		}

		$this->slides_url = false;

		return $this->slides_url;
	}

	/**
	 * Get the event's follow up URL.
	 */
	public function get_follow_up_url() {

		// Make sure we have an ID
		if ( ! ( $this->ID >= 1 ) ) {
			return false;
		}

		// If already set, return the URL
		if ( isset( $this->follow_up_url ) ) {
			return $this->follow_up_url;
		}

		// Get our enabled session fields
		$session_fields = conference_schedule()->get_session_fields();

		// Is follow up enabled?
		if ( empty( $session_fields ) || ! in_array( 'follow_up', $session_fields ) ) {
			$this->follow_up_url = false;
			return $this->follow_up_url;
		}

		// Get the follow up URL
		$follow_up_url = get_post_meta( $this->ID, 'conf_sch_event_follow_up_url', true );

		// Filter the follow up URL
		$follow_up_url = apply_filters( 'conf_sch_follow_up_url', $follow_up_url, $this->post );

		$this->follow_up_url = ! empty( $follow_up_url ) ? $follow_up_url : false;

		return $this->follow_up_url;
	}

	/**
	 * Get the event's video URL.
	 */
	public function get_video_url() {

		// Make sure we have an ID
		if ( ! ( $this->ID >= 1 ) ) {
			return false;
		}

		// If already set, return the URL
		if ( isset( $this->video_url ) ) {
			return $this->video_url;
		}

		// Get our enabled session fields
		$session_fields = conference_schedule()->get_session_fields();

		// Is the video URL enabled?
		if ( empty( $session_fields ) || ! in_array( 'video', $session_fields ) ) {
			$this->video_url = false;
			return $this->video_url;
		}

		// Get the URL
		$video_url = get_post_meta( $this->ID, 'conf_sch_event_video_url', true );

		// Filter the video URL
		$video_url = apply_filters( 'conf_sch_video_url', $video_url, $this->ID );

		$this->video_url = ! empty( $video_url ) ? $video_url : false;

		return $this->video_url;
	}

	/**
	 * Get the event's feedback URL.
	 */
	public function get_feedback_url() {

		// Make sure we have an ID
		if ( ! ( $this->ID >= 1 ) ) {
			return false;
		}

		// If already set, return the URL
		if ( isset( $this->feedback_url ) ) {
			return $this->feedback_url;
		}

		// Get our enabled session fields
		$session_fields = conference_schedule()->get_session_fields();

		// Is feedback enabled?
		if ( empty( $session_fields ) || ! in_array( 'feedback', $session_fields ) ) {
			$this->feedback_url = false;
			return $this->feedback_url;
		}

		/*
		 * Feedback URL will only show up
		 * 30 minutes after the session has started.
		 *
		 * If no valid session time, well show URL.
		 */
		$feedback_url = get_post_meta( $this->ID, 'conf_sch_event_feedback_url', true );

		// Filter the feedback URL
		$feedback_url = apply_filters( 'conf_sch_feedback_url', $feedback_url, $this->post );
		if ( $feedback_url ) {

			// What time is it?
			$current_time = new DateTime( 'now', new DateTimeZone( 'UTC' ) );

			// Get date in UTC
			$event_date_time_gmt = $this->get_date_time_gmt();

			// Send URL if time is not valid
			if ( ! empty( $event_date_time_gmt ) && strtotime( $event_date_time_gmt ) !== false ) {

				// Build event start date
				$event_start = new DateTime( $event_date_time_gmt, new DateTimeZone( 'UTC' ) );

				// Get reveal delay
				$session_feedback_reveal_delay_seconds = get_post_meta( $this->ID, 'conf_sch_event_feedback_reveal_delay_seconds', true );

				// Set the default delay to 30 minutes
				if ( ! empty( $session_feedback_reveal_delay_seconds ) && $session_feedback_reveal_delay_seconds > 0 ) {
					$session_feedback_reveal_delay_seconds = intval( $session_feedback_reveal_delay_seconds );
				} else {
					$session_feedback_reveal_delay_seconds = 1800;
				}

				// Feedback URL will only show up 30 minutes after the event has started
				if ( ( $current_time->getTimestamp() - $event_start->getTimestamp() ) >= $session_feedback_reveal_delay_seconds ) {
					$this->feedback_url = $feedback_url;
					return $this->feedback_url;
				}

				$this->feedback_url = false;

				return $this->feedback_url;
			}

			// If no valid event time, well show URL
			$this->feedback_url = $feedback_url;

			return $this->feedback_url;
		}

		$this->feedback_url = false;

		return $this->feedback_url;
	}
}

/**
 * Powers our events. It's pretty impressive.
 *
 * Class Conference_Schedule_Events
 */
class Conference_Schedule_Events {

	/**
	 * Will hold the events.
	 *
	 * @since   1.0.0
	 * @access  private
	 * @var     array
	 */
	private $events;

	/**
	 * Holds the class instance.
	 *
	 * @since    1.0.0
	 * @access    private
	 * @var        Conference_Schedule
	 */
	private static $instance;

	/**
	 * Returns the instance of this class.
	 *
	 * @access  public
	 * @since   1.0.0
	 * @return    Conference_Schedule
	 */
	public static function instance() {
		if ( ! isset( self::$instance ) ) {
			$class_name     = __CLASS__;
			self::$instance = new $class_name;
		}

		return self::$instance;
	}

	/**
	 * Warming things up.
	 *
	 * @access  public
	 * @since   1.0.0
	 */
	protected function __construct() {

		// Register custom post types
		add_action( 'init', array( $this, 'register_custom_post_types' ), 0 );

	}

	/**
	 * Method to keep our instance from
	 * being cloned or unserialized.
	 *
	 * @since   1.0.0
	 * @access  private
	 * @return  void
	 */
	private function __clone() {}
	private function __wakeup() {}

	/**
	 * Registers our event custom post types.
	 *
	 * @access  public
	 * @since   1.0.0
	 */
	public function register_custom_post_types() {

		// Define the labels for the schedule CPT.
		$schedule_labels = apply_filters( 'conf_schedule_cpt_labels', array(
			'name'               => _x( 'Schedule', 'Post Type General Name', 'conf-schedule' ),
			'singular_name'      => _x( 'Event', 'Post Type Singular Name', 'conf-schedule' ),
			'menu_name'          => __( 'Schedule', 'conf-schedule' ),
			'name_admin_bar'     => __( 'Schedule', 'conf-schedule' ),
			'archives'           => __( 'Schedule', 'conf-schedule' ),
			'all_items'          => __( 'All Events', 'conf-schedule' ),
			'add_new_item'       => __( 'Add New Event', 'conf-schedule' ),
			'new_item'           => __( 'New Event', 'conf-schedule' ),
			'edit_item'          => __( 'Edit Event', 'conf-schedule' ),
			'update_item'        => __( 'Update Event', 'conf-schedule' ),
			'view_item'          => __( 'View Event', 'conf-schedule' ),
			'search_items'       => __( 'Search Events', 'conf-schedule' ),
			'not_found'          => __( 'No events found.', 'conf-schedule' ),
			'not_found_in_trash' => __( 'No events found in the trash.', 'conf-schedule' ),
		) );

		// Define the args for the schedule CPT.
		$schedule_args = apply_filters( 'conf_schedule_cpt_args', array(
			'label'           => __( 'Schedule', 'conf-schedule' ),
			'description'     => __( 'The schedule content for your conference.', 'conf-schedule' ),
			'labels'          => $schedule_labels,
			'public'          => true,
			'hierarchical'    => true,
			'supports'        => array(
				'title',
				'editor',
				'thumbnail',
				'excerpt',
				'revisions',
			),
			'has_archive'     => false,
			'menu_icon'       => 'dashicons-calendar',
			'can_export'      => true,
			'capability_type' => 'post',
			'show_in_rest'    => true,
			'rewrite'         => array(
				'slug'       => 'schedule',
				'with_front' => false,
				'pages'      => false,
			),
		) );

		// Register the schedule custom post type.
		register_post_type( 'schedule', $schedule_args );

	}

	/**
	 * Use to get the object for a specific event.
	 *
	 * @param   $event_id - the event post ID
	 * @return  object - Conference_Schedule_Event
	 */
	public function get_event( $event_id ) {

		// If event already constructed, return the event.
		if ( isset( $this->events[ $event_id ] ) ) {
			return $this->events[ $event_id ];
		}

		// Get/store the event.
		$this->events[ $event_id ] = new Conference_Schedule_Event( $event_id );

		return $this->events[ $event_id ];
	}
}

/**
 * Returns the instance of our Conference_Schedule_Events class.
 *
 * Will come in handy when we need to access the
 * class to retrieve data throughout the plugin.
 *
 * @since   1.0.0
 * @access  public
 * @return  Conference_Schedule_Events
 */
function conference_schedule_events() {
	return Conference_Schedule_Events::instance();
}

// Let's get this show on the road.
conference_schedule_events();
