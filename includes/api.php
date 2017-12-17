<?php

class Conference_Schedule_API {

	/**
	 * Holds the class instance.
	 *
	 * @since	1.0.0
	 * @access	private
	 * @var		Conference_Schedule_API
	 */
	private static $instance;

	/**
	 * Returns the instance of this class.
	 *
	 * @access  public
	 * @since   1.0.0
	 * @return	Conference_Schedule_API
	 */
	public static function instance() {
		if ( ! isset( self::$instance ) ) {
			$class_name = __CLASS__;
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

		// Register any REST fields
		add_action( 'rest_api_init', array( $this, 'register_rest_fields' ), 20 );

	}

	/**
	 * Get the selected event.
	 */
	private function get_event( $event_id ) {
		return conference_schedule_events()->get_event( $event_id );
	}

	/**
	 * Register additional fields for the REST API.
	 *
	 * @access  public
	 * @since   1.0.0
	 */
	public function register_rest_fields() {

		// Add event info.
		$event_fields = array(
			'event_dt',
			'event_dt_gmt',
			'event_date',
			'event_start_time',
			'event_end_time',
			'event_date_display',
			'event_time_display',
			'event_duration',
			'event_parent',
			'event_types',
			'event_location',
			'event_address',
			'event_google_maps_url',
			'link_to_post',
			'event_speakers',
			'event_hashtag',
			'session_categories',
			'session_livestream_url',
			'session_slides_url',
			'session_feedback_url',
			'session_follow_up_url',
			'session_video_url',
		);
		foreach ( $event_fields as $field_name ) {
			register_rest_field( 'schedule', $field_name, array(
				'get_callback'		=> array( $this, 'get_event_field_value' ),
				'update_callback'	=> null,
				'schema'			=> null,
			));
		}

		// Add speaker info.
		$speaker_fields = array(
			'speaker_thumbnail',
			'speaker_position',
			'speaker_url',
			'speaker_company',
			'speaker_company_url',
			'speaker_facebook',
			'speaker_instagram',
			'speaker_twitter',
			'speaker_linkedin',
		);
		foreach ( $speaker_fields as $field_name ) {
			register_rest_field( 'speakers', $field_name, array(
				'get_callback'		=> array( $this, 'get_speaker_field_value' ),
				'update_callback'	=> null,
				'schema'			=> null,
			));
		}

		// Add location info.
		$location_fields = array(
			'address',
			'google_maps_url',
		);

		foreach ( $location_fields as $field_name ) {
			register_rest_field( 'locations', $field_name, array(
				'get_callback'		=> array( $this, 'get_location_field_value' ),
				'update_callback'	=> null,
				'schema'			=> null,
			));
		}

	}

	/**
	 * Get event field values for the REST API.
	 *
	 * @param	array - $object - details of current post
	 * @param	string - $field_name - name of field
	 * @param	WP_REST_Request - $request - current request
	 * @return	mixed
	 */
	public function get_event_field_value( $object, $field_name, $request ) {
		global $wpdb;

		// Get the event.
		$event = $this->get_event( $object['id'] );

		switch ( $field_name ) {

			// Get the start time.
			case 'event_start_time':
				$event_start_time = $event->get_start_time();
				return ! empty( $event_start_time ) ? $event_start_time : null;

			// Get the end time.
			case 'event_end_time':
				$event_end_time = $event->get_end_time();
				return ! empty( $event_end_time ) ? $event_end_time : null;

			// Get the event date/time.
			case 'event_dt':
				$event_date_time = $event->get_date_time();
				return ! empty( $event_date_time ) ? $event_date_time : null;

			// Get the event date/time in GMT.
			case 'event_dt_gmt':
				$event_date_gmt = $event->get_date_time_gmt();
				return ! empty( $event_date_gmt ) ? $event_date_gmt : null;

			// Get the event date.
			case 'event_date':
				$event_date = $event->get_date();
				return ! empty( $event_date ) ? $event_date : null;

			// Get the event parent.
			case 'event_parent':
				return $event->get_parent();

			// Get the event date display.
			case 'event_date_display':
				$event_date_display = $event->get_date_display();
				return ! empty( $event_date_display ) ? $event_date_display : null;

			// Get the event duration.
			case 'event_duration':
				$event_duration = $event->get_duration();
				return ! empty( $event_duration ) ? $event_duration : null;

			// Build the event time display.
			case 'event_time_display':
				$event_time_display = $event->get_time_display();
				return ! empty( $event_time_display ) ? $event_time_display : null;

			case 'event_types':
				$types = wp_get_object_terms( $object['id'], 'event_types', array( 'fields' => 'slugs' ) );
				return ! empty( $types ) ? $types : null;

			case 'session_categories':
				$categories = wp_get_object_terms( $object['id'], 'session_categories', array( 'fields' => 'names' ) );
				return ! empty( $categories ) ? $categories : null;

			// Get the hashtag.
			case 'event_hashtag':
				$event_hashtag = $event->get_hashtag();
				return ! empty( $event_hashtag ) ? $event_hashtag : null;

			// Get the event location.
			case 'event_location':

				// Get the location.
				$event_location = $event->get_location();
				if ( ! empty( $event_location->ID ) ) {

					/*
					 * See if we want to add/display the permalink.
					 *
					 * First, check the database.
					 * If row exists, then check the value.
					 */
					$sch_link_to_post_db = $wpdb->get_var( $wpdb->prepare( "SELECT meta_id FROM {$wpdb->postmeta} WHERE post_id = %d AND meta_key = 'conf_sch_link_to_post'", $event_location->ID ) );
					if ( $sch_link_to_post_db ) {
						$sch_link_to_post = get_post_meta( $event_location->ID, 'conf_sch_link_to_post', true );
						if ( $sch_link_to_post ) {
							$event_location->permalink = get_permalink( $event_location->ID );
						}
					}

					return $event_location;
				}

				return null;

			case 'event_address':
				$event_location_address = $event->get_location_address();
				return ! empty( $event_location_address ) ? $event_location_address : null;

			// Get the event's location's Google Maps URL.
			case 'event_google_maps_url':
				$event_google_maps_url = $event->get_google_maps_url();
				return ! empty( $event_google_maps_url ) ? $event_google_maps_url : null;

			/*
			 * See if we need to link to the event post in the schedule.
			 *
			 * The default is true.
			 *
			 * If database row doesn't exist, then set as default.
			 * Otherwise, check value.
			 */
			case 'link_to_post':

				// Check the database.
				$sch_link_to_post_db = $wpdb->get_var( $wpdb->prepare( "SELECT meta_id FROM {$wpdb->postmeta} WHERE post_id = %d AND meta_key = 'conf_sch_link_to_post'", $object['id'] ) );

				// If row exists, then check the value.
				if ( $sch_link_to_post_db ) {
					$sch_link_to_post = get_post_meta( $object['id'], 'conf_sch_link_to_post', true );
					if ( ! $sch_link_to_post ) {
						return false;
					}
				}

				return true;

			// Get event speakers.
			case 'event_speakers':
				$event_speakers = $event->get_speakers();
				return ! empty( $event_speakers ) ? $event_speakers : null;

			/*
			 * Livestream URL will only show up
			 * a certain time before the session starts
			 * and stay until it ends.
			 */
			case 'session_livestream_url':
				return $event->get_livestream_url();

			case 'session_slides_url':
				$event_slides_url = $event->get_slides_url();
				return ! empty( $event_slides_url ) ? $event_slides_url : null;

			case 'session_follow_up_url':
				$event_follow_up_url = $event->get_follow_up_url();
				return ! empty( $event_follow_up_url ) ? $event_follow_up_url : null;

			case 'session_video_url':
				$event_video_url = $event->get_video_url();
				return ! empty( $event_video_url ) ? $event_video_url : null;

			case 'session_feedback_url':
				$event_feedback_url = $event->get_feedback_url();
				return ! empty( $event_feedback_url ) ? $event_feedback_url : null;

		}

		return null;
	}

	/**
	 * Get speaker field values for the REST API.
	 *
	 * @param	array - $object - details of current post
	 * @param	string - $field_name - name of field
	 * @param	WP_REST_Request - $request - current request
	 * @return	mixed
	 */
	public function get_speaker_field_value( $object, $field_name, $request ) {

		// Define field post meta key.
		$field_meta_key = "conf_sch_{$field_name}";

		switch ( $field_name ) {

			case 'speaker_position':
			case 'speaker_url':
			case 'speaker_company':
			case 'speaker_company_url':
			case 'speaker_facebook':
			case 'speaker_instagram':
			case 'speaker_twitter':
			case 'speaker_linkedin':

				if ( ! empty( $object[ $field_name ] ) ) {
					$field_value = $object[ $field_name ];
				} else {
					$field_value = get_post_meta( $object['id'], $field_meta_key, true );
				}
				return ! empty( $field_value ) ? $field_value : null;

			case 'speaker_thumbnail':
				$image = wp_get_attachment_image_src( get_post_thumbnail_id( $object['id'] ), 'thumbnail' );
				return ! empty( $image[0] ) ? $image[0] : null;

		}

	}

	/**
	 * Get location field values for the REST API.
	 *
	 * @param	array - $object - details of current post
	 * @param	string - $field_name - name of field
	 * @param	WP_REST_Request - $request - current request
	 * @return	mixed
	 */
	public function get_location_field_value( $object, $field_name, $request ) {

		switch ( $field_name ) {

			case 'address':
				$conf_sch_location_address = get_post_meta( $object['id'], 'conf_sch_location_address', true );
				return ! empty( $conf_sch_location_address ) ? $conf_sch_location_address : null;

			// Gets the URL for API location endpoints.
			case 'google_maps_url':
				$google_maps_url = get_post_meta( $object['id'], 'conf_sch_location_google_maps_url', true );
				return ! empty( $google_maps_url ) ? $google_maps_url : null;

		}
	}

}

/**
 * Returns the instance of our Conference_Schedule_API class.
 *
 * Will come in handy when we need to access the
 * class to retrieve data throughout the plugin.
 *
 * @since	1.0.0
 * @access	public
 * @return	Conference_Schedule_API
 */
function conference_schedule_api() {
	return Conference_Schedule_API::instance();
}

// Let's get this show on the road.
conference_schedule_api();
