<?php

/**
 * Powers individuals speakers.
 *
 * Class Conference_Schedule_Speaker
 */
class Conference_Schedule_Speaker {

	/**
	 * Will hold the speaker's events.
	 *
	 * @since   1.0.0
	 * @access  private
	 * @var     array
	 */
	private $events;

	/**
	 * Will hold the speaker's
	 * post ID if a valid speaker.
	 *
	 * @since   1.0.0
	 * @access  private
	 * @var     int
	 */
	private $ID;

	/**
	 * Will hold the speaker' post data.
	 *
	 * @since   1.0.0
	 * @access  private
	 * @var     WP_Post
	 */
	private $post;

	/**
	 * Did we just construct a person?
	 *
	 * @access  public
	 * @since   1.0.0
	 * @param   $post_id - the speaker post ID
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
	 * Get the speaker's events.
	 *
	 * @TODO: update to work with new system.
	 *
	 * @access  public
	 * @since   1.0.0
	 * @return  array - the events
	 */
	public function get_events() {

		// Make sure we have an ID.
		if ( ! $this->ID ) {
			return array();
		}

		// Return events if already set.
		if ( isset( $this->events ) ) {
			return $this->events;
		}

		return array();

		// Get the events.
		/*return $this->events = get_posts( array(
			'posts_per_page'   => -1,
			'orderby'          => 'title',
			'order'            => 'ASC',
			'meta_key'         => 'conf_sch_event_speaker',
			'meta_value'       => $this->ID,
			'post_type'        => 'schedule',
			'post_status'      => 'any',
			'suppress_filters' => true,
		));*/
	}
}

/**
 * Powers our speakers. It's pretty impressive.
 *
 * Class Conference_Schedule_Speakers
 */
class Conference_Schedule_Speakers {

	/**
	 * Will hold the speakers.
	 *
	 * @since   1.0.0
	 * @access  private
	 * @var     array
	 */
	private $speakers;

	/**
	 * Holds the class instance.
	 *
	 * @since   1.0.0
	 * @access  private
	 * @var     Conference_Schedule
	 */
	private static $instance;

	/**
	 * Returns the instance of this class.
	 *
	 * @access  public
	 * @since   1.0.0
	 * @return  Conference_Schedule
	 */
	public static function instance() {
		if ( ! isset( self::$instance ) ) {
			$class_name      = __CLASS__;
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
	protected function __construct() {}

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
	 * Use to get the object for a specific speaker.
	 *
	 * @param   $speaker_id - the speaker post ID
	 * @return  object - Conference_Schedule_Speaker
	 */
	public function get_speaker( $speaker_id ) {

		// If speaker already constructed, return the speaker.
		if ( isset( $this->speakers[ $speaker_id ] ) ) {
			return $this->speakers[ $speaker_id ];
		}

		// Get/return the speaker.
		return $this->speakers[ $speaker_id ] = new Conference_Schedule_Speaker( $speaker_id );
	}
}

/**
 * Returns the instance of our Conference_Schedule_Speakers class.
 *
 * Will come in handy when we need to access the
 * class to retrieve data throughout the plugin.
 *
 * @since   1.0.0
 * @access  public
 * @return  Conference_Schedule_Speakers
 */
function conference_schedule_speakers() {
	return Conference_Schedule_Speakers::instance();
}

// Let's get this show on the road.
conference_schedule_speakers();
