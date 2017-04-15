<?php

/**
 * Powers individuals speakers.
 *
 * Class Conference_Schedule_Speaker
 */
class Conference_Schedule_Speaker {

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
	protected function __construct() {

		// Register custom post types
		add_action( 'init', array( $this, 'register_custom_post_types' ), 0 );

	}

	/**
	 * Method to keep our instance from
	 * being cloned or unserialized.
	 *
	 * @since	1.0.0
	 * @access	private
	 * @return	void
	 */
	private function __clone() {}
	private function __wakeup() {}

	/**
	 * Registers our speaker custom post types.
	 *
	 * @access  public
	 * @since   1.0.0
	 */
	public function register_custom_post_types() {

		// Define the labels for the speakers CPT.
		$speakers_labels = apply_filters( 'conf_schedule_speakers_cpt_labels', array(
			'name'               => _x( 'Speakers', 'Post Type General Name', 'conf-schedule' ),
			'singular_name'      => _x( 'Speaker', 'Post Type Singular Name', 'conf-schedule' ),
			'menu_name'          => __( 'Speakers', 'conf-schedule' ),
			'name_admin_bar'     => __( 'Speakers', 'conf-schedule' ),
			'archives'           => __( 'Speakers', 'conf-schedule' ),
			'all_items'          => __( 'All Speakers', 'conf-schedule' ),
			'add_new_item'       => __( 'Add New Speaker', 'conf-schedule' ),
			'new_item'           => __( 'New Speaker', 'conf-schedule' ),
			'edit_item'          => __( 'Edit Speaker', 'conf-schedule' ),
			'update_item'        => __( 'Update Speaker', 'conf-schedule' ),
			'view_item'          => __( 'View Speaker', 'conf-schedule' ),
			'search_items'       => __( 'Search Speakers', 'conf-schedule' ),
			'not_found'          => __( 'No speakers found.', 'conf-schedule' ),
			'not_found_in_trash' => __( 'No speakers found in the trash.', 'conf-schedule' ),
		) );

		// Define the args for the speakers CPT.
		$speakers_args = apply_filters( 'conf_schedule_speakers_cpt_args', array(
			'label'             => __( 'Speakers', 'conf-schedule' ),
			'description'       => __( 'The speakers content for your conference.', 'conf-schedule' ),
			'labels'            => $speakers_labels,
			'public'            => true,
			'hierarchical'      => false,
			'supports'          => array( 'title', 'editor', 'thumbnail', 'excerpt', 'revisions' ),
			'has_archive'       => true,
			'menu_icon'         => 'dashicons-admin-users',
			'can_export'        => true,
			'capability_type'   => 'post',
			'show_in_menu'      => 'edit.php?post_type=schedule',
			'show_in_rest'      => true,
		) );

		// Register the speakers custom post type.
		register_post_type( 'speakers', $speakers_args );

	}

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
 * @since	1.0.0
 * @access	public
 * @return	Conference_Schedule_Speakers
 */
function conference_schedule_speakers() {
	return Conference_Schedule_Speakers::instance();
}

// Let's get this show on the road.
conference_schedule_speakers();
