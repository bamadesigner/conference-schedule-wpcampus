<?php

/**
 * Plugin Name:     WPCampus: Conference Schedule
 * Plugin URI:      https://github.com/wpcampus/conference-schedule
 * Description:     Helps you build a simple schedule for your conference website.
 * Version:         1.0.0
 * Author:          WPCampus
 * Author URI:      https://wpcampus.org/
 * License:         GPL-2.0+
 * License URI:		http://www.gnu.org/licenses/gpl-2.0.txt
 * Text Domain:		conf-schedule
 * Domain Path:		/languages
 *
 * Package:			Conference_Schedule
 */

/**
 * @TODO:
 * - Be able to overwrite schedule permalink with slug from proposal.
 * - Delete all of the speaker meta boxes and fields.
 * - Make sure session type gets added as class in schedule markup.
 * - Look for all uses of "event_type" in plugins.
 */

/*
 * @TODO:
 * Add language files
 * Check all filter names to make sure they make sense
 * Make sure, when multiple sessions in a row, they're always in same room order
 * Add settings: need a way to know if they want track labels or not
 * Allow for shortcode to only show specific days or time ranges
 * Set it up so that past days collapse
 * Add button to go to current event?
 * Stylize current event(s)
 * Setup media library integration with slides file
 * Disable saving a post until all API fields load
 */

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}

// If you define them, will they be used?
define( 'CONFERENCE_SCHEDULE_VERSION', '1.0.0' );
define( 'CONFERENCE_SCHEDULE_PLUGIN_URL', 'https://github.com/wpcampus/conference-schedule' );
define( 'CONFERENCE_SCHEDULE_PLUGIN_FILE', 'conference-schedule/conference-schedule.php' );

// Require the files we need.
require_once plugin_dir_path( __FILE__ ) . 'includes/speakers.php';
require_once plugin_dir_path( __FILE__ ) . 'includes/events.php';
require_once plugin_dir_path( __FILE__ ) . 'includes/api.php';

// We only need admin functionality in the admin.
if ( is_admin() ) {
	require_once plugin_dir_path( __FILE__ ) . 'includes/fields.php';
	require_once plugin_dir_path( __FILE__ ) . 'includes/admin.php';
}

/**
 * Holds the main administrative
 * functionality for the plugin.
 */
class Conference_Schedule {

	/**
	 * Whether or not this plugin is network active.
	 *
	 * @access	public
	 * @var		boolean
	 */
	public $is_network_active;

	/**
	 * Will hold the plugin's settings.
	 *
	 * @access	private
	 * @var		array
	 */
	private $settings;

	/**
	 * Will hold the site's timezone.
	 *
	 * @access	private
	 * @var		string
	 */
	private $site_timezone;

	/**
	 * Will hold the enabled session fields.
	 *
	 * @access	private
	 * @var		array
	 */
	private $session_fields;

	/**
	 * Will hold the enabled schedule display fields.
	 *
	 * @access	private
	 * @var		array
	 */
	private $schedule_display_fields;

	/**
	 * Will be true if we need to
	 * load the schedule assets.
	 *
	 * @access  private
	 * @var     bool
	 */
	private $load_schedule = false;

	/**
	 * Will be true if we want
	 * to print a specific list.
	 *
	 * @access  private
	 * @var     bool
	 */
	private $print_events_list = false;
	private $print_speakers_list = false;

	/**
	 * Holds the class instance.
	 *
	 * @access	private
	 * @var		Conference_Schedule
	 */
	private static $instance;

	/**
	 * Returns the instance of this class.
	 *
	 * @access  public
	 * @return	Conference_Schedule
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
	 */
	protected function __construct() {

		// Is this plugin network active?
		$this->is_network_active = is_multisite() && ( $plugins = get_site_option( 'active_sitewide_plugins' ) ) && isset( $plugins[ CONFERENCE_SCHEDULE_PLUGIN_FILE ] );

		// Load our textdomain.
		add_action( 'init', array( $this, 'textdomain' ) );

		// Runs on install.
		register_activation_hook( __FILE__, array( $this, 'install' ) );

		// Runs when the plugin is upgraded.
		add_action( 'upgrader_process_complete', array( $this, 'upgrader_process_complete' ), 1, 2 );

		// Add theme support.
		add_action( 'after_setup_theme', array( $this, 'add_theme_support' ) );

		// Return data to AJAX.
		add_action( 'wp_ajax_conf_sch_get_proposals', array( $this, 'ajax_get_proposals' ) );
		add_action( 'wp_ajax_nopriv_conf_sch_get_proposals', array( $this, 'ajax_get_proposals' ) );

		add_action( 'wp_ajax_conf_sch_get_proposal', array( $this, 'ajax_get_proposal' ) );
		add_action( 'wp_ajax_nopriv_conf_sch_get_proposal', array( $this, 'ajax_get_proposal' ) );

		add_action( 'wp_ajax_conf_sch_get_speakers', array( $this, 'ajax_get_speakers' ) );
		add_action( 'wp_ajax_nopriv_conf_sch_get_speakers', array( $this, 'ajax_get_speakers' ) );

		// Adjust the schedule query.
		add_filter( 'query_vars', array( $this, 'add_query_vars' ) );
		add_action( 'pre_get_posts', array( $this, 'filter_pre_get_posts' ), 20 );
		add_filter( 'posts_clauses', array( $this, 'filter_posts_clauses' ), 20, 2 );

		// Add needed styles and scripts.
		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_styles_scripts' ), 20 );

		// Tweak the event pages and add schedule to a page, if necessary.
		add_filter( 'the_content', array( $this, 'the_content' ), 1000 );

		// Add handlebar templates to the footer when needed.
		add_action( 'wp_footer', array( $this, 'print_handlebar_templates' ) );

		// Register custom post types.
		add_action( 'init', array( $this, 'register_custom_post_types' ), 0 );

		// Add our [print_conference_schedule] shortcode.
		add_shortcode( 'print_conference_schedule', array( $this, 'conference_schedule_shortcode' ) );
		add_shortcode( 'print_conference_schedule_events', array( $this, 'conference_schedule_events_shortcode' ) );
		add_shortcode( 'print_conference_schedule_speakers', array( $this, 'conference_schedule_speakers_shortcode' ) );

		// Process the schedule post type when it's saved.
		add_action( 'save_post_schedule', array( $this, 'process_schedule_save' ), 10, 3 );

	}

	/**
	 * Method to keep our instance from
	 * being cloned or unserialized.
	 *
	 * @access	private
	 * @return	void
	 */
	private function __clone() {}
	private function __wakeup() {}

	/**
	 * Runs when the plugin is installed.
	 *
	 * @access  public
	 */
	public function install() {

		// Flush the rewrite rules to start fresh.
		flush_rewrite_rules( true );

	}

	/**
	 * Runs when the plugin is upgraded.
	 *
	 * @access  public
	 */
	public function upgrader_process_complete() {

		// Flush the rewrite rules to start fresh.
		flush_rewrite_rules( true );

	}

	/**
	 * Internationalization FTW.
	 * Load our textdomain.
	 *
	 * @access  public
	 */
	public function textdomain() {
		load_plugin_textdomain( 'conf-schedule', false, dirname( plugin_basename( __FILE__ ) ) . '/languages' );
	}

	/**
	 * Add theme support.
	 *
	 * @access	public
	 */
	public function add_theme_support() {

		// Add theme support for featured images.
		add_theme_support( 'post-thumbnails' );

	}

	/**
	 * Returns settings for the front-end.
	 *
	 * @access  public
	 * @return  array - the settings
	 */
	public function get_settings() {

		// If already set, return the settings.
		if ( isset( $this->settings ) ) {
			return $this->settings;
		}

		// Define the default settings.
		$default_settings = array(
			'schedule_add_page' => '',
			'session_fields'    => array(
				'slides',
			),
			'schedule_display_fields' => array(
				'view_slides',
				'view_livestream',
				'watch_video',
			),
		);

		// Get/store the settings.
		return $this->settings = get_option( 'conf_schedule', $default_settings );
	}
	
	/**
	 * Get the site's timezone abbreviation.
	 */
	public function get_site_timezone() {

		// If already set, return.
		if ( isset( $this->site_timezone ) ) {
			return $this->site_timezone;
		}
		
		// Get from settings.
		$timezone = get_option( 'timezone_string' );
		if ( empty( $timezone ) ) {
			$timezone = 'UTC';
		}
		
		$timezone = new DateTime( 'now', new DateTimeZone( $timezone ) );
		
		// Get abbreviation.
		return $this->site_timezone = $timezone->format( 'T' );
	}

	/**
	 * Returns array of enabled session fields.
	 *
	 * @access  public
	 * @return  array - the enabled session fields
	 */
	public function get_session_fields() {

		// If already set, return the settings.
		if ( isset( $this->session_fields ) ) {
			return $this->session_fields;
		}

		// Get settings.
		$settings = $this->get_settings();

		// Get enabled session fields.
		$session_fields = ! empty( $settings['session_fields'] ) ? $settings['session_fields'] : array();

		// Make sure its an array.
		if ( ! is_array( $session_fields ) ) {
			$session_fields = explode( ', ', $session_fields );
		}

		return $this->session_fields = apply_filters( 'conf_schedule_session_fields', $session_fields );
	}

	/**
	 * Returns array of enabled schedule display fields.
	 *
	 * @access  public
	 * @return  array - the enabled session fields
	 */
	public function get_schedule_display_fields() {

		// If already set, return the settings.
		if ( isset( $this->schedule_display_fields ) ) {
			return $this->schedule_display_fields;
		}

		// Get settings.
		$settings = $this->get_settings();

		// Get enabled schedule display fields.
		$display_fields = isset( $settings['schedule_display_fields'] ) ? $settings['schedule_display_fields'] : array();

		// Make sure its an array.
		if ( ! is_array( $display_fields ) ) {
			$display_fields = explode( ', ', $display_fields );
		}

		return $this->schedule_display_fields = apply_filters( 'conf_schedule_display_fields', $display_fields );
	}

	/**
	 * Add custom query vars.
	 *
	 * @access  public
	 */
	public function add_query_vars( $vars ) {
		$vars[] = 'conf_sch_ignore_clause_filter';
		$vars[] = 'conf_sch_event_date';
		$vars[] = 'conf_sch_event_type';
		return $vars;
	}

	/**
	 * Adjust the schedule query.
	 *
	 * @access  public
	 */
	public function filter_pre_get_posts( $query ) {

		// Not in admin.
		if ( is_admin() ) {
			return false;
		}

		// Have to check single array with json queries.
		$post_type = $query->get( 'post_type' );

		if ( 'schedule' == $post_type
			|| ( is_array( $post_type ) && in_array( 'schedule', $post_type ) && count( $post_type ) == 1 ) ) {

			/*
			 * Always get all schedule items.
			 *
			 * @TODO: Need to come up with
			 * solution for if more than 100 posts.
			 */
			$query->set( 'posts_per_page' , '100' );

			// Default order is by title ASC.
			$query->set( 'orderby', 'title' );
			$query->set( 'order', 'ASC' );

		}
	}

	/**
	 * Filter the queries to "join" and order schedule information.
	 *
	 * @access  public
	 */
	public function filter_posts_clauses( $pieces, $query ) {
		global $wpdb;

		// If we pass a filter telling it to ignore our filter.
		if ( '1' == $query->get( 'conf_sch_ignore_clause_filter' ) ) {
			return $pieces;
		}

		// Only for schedule query.
		$post_type = $query->get( 'post_type' );

		if ( 'schedule' == $post_type
			|| ( is_array( $post_type ) && in_array( 'schedule', $post_type ) && count( $post_type ) == 1 ) ) {

			// Join to get name info.
			foreach ( array( 'conf_sch_event_date', 'event_type', 'conf_sch_event_start_time', 'conf_sch_event_end_time' ) as $name_part ) {

				// Might as well store the join info as fields.
				$pieces['fields'] .= ", {$name_part}.meta_value AS {$name_part}";

				// "Join" to get the info.
				$pieces['join'] .= " LEFT JOIN {$wpdb->postmeta} {$name_part} ON {$name_part}.post_id = {$wpdb->posts}.ID AND {$name_part}.meta_key = '{$name_part}'";

			}

			// Get the location information.
			$pieces['fields'] .= ", IF ( conf_sch_event_location.meta_value IS NOT NULL, ( SELECT post_title FROM {$wpdb->posts} WHERE ID = conf_sch_event_location.meta_value ), '' ) AS conf_sch_event_location";
			$pieces['join'] .= " LEFT JOIN {$wpdb->postmeta} conf_sch_event_location ON conf_sch_event_location.post_id = {$wpdb->posts}.ID AND conf_sch_event_location.meta_key = 'conf_sch_event_location'";

			// Setup the orderby.
			if ( ! is_admin() ) {
				$pieces['orderby'] = ' CAST( conf_sch_event_date.meta_value AS DATE ) ASC, conf_sch_event_start_time.meta_value ASC, conf_sch_event_location ASC, conf_sch_event_end_time ASC';
			}

			// Are we querying by a specific event date?
			$event_date = null;

			$event_date = $query->get( 'conf_sch_event_date' );
			if ( ! $event_date && ! empty( $_GET['conf_sch_event_date'] ) ) {
				$event_date = sanitize_text_field( $_GET['conf_sch_event_date'] );
			}

			if ( ! empty( $event_date ) ) {
				$pieces['where'] .= " AND CAST( conf_sch_event_date.meta_value AS DATE ) = '" . $event_date . "'";
			}

			// Are we querying by a specific event type??
			$event_type = null;

			$event_type = $query->get( 'conf_sch_event_type' );
			if ( ! $event_type && ! empty( $_GET['conf_sch_event_type'] ) ) {
				$event_type = sanitize_text_field( $_GET['conf_sch_event_type'] );
			}

			if ( ! empty( $event_type ) ) {
				$pieces['where'] .= $wpdb->prepare( ' AND event_type.meta_value = %s', $event_type );
			}
		}

		return $pieces;
	}

	/**
	 * If called, will tell us to
	 * load the schedule assets.
	 *
	 * @access  public
	 */
	public function load_schedule() {
		$this->load_schedule = true;
	}

	/**
	 * Add styles and scripts for our shortcodes.
	 *
	 * @access  public
	 * @param	string - $hook_suffix - the ID of the current page
	 */
	public function enqueue_styles_scripts() {
		global $post;

		// Register our icons.
		wp_register_style( 'conf-schedule-icons', trailingslashit( plugin_dir_url( __FILE__ ) . 'assets/css' ) . 'conf-schedule-icons.min.css', array(), null );

		// Register our schedule styles.
		wp_register_style( 'conf-schedule', trailingslashit( plugin_dir_url( __FILE__ ) . 'assets/css' ) . 'conf-schedule.min.css', array( 'conf-schedule-icons' ), null );

		// Register handlebars.
		wp_register_script( 'handlebars', '//cdnjs.cloudflare.com/ajax/libs/handlebars.js/4.0.5/handlebars.min.js', array(), null );

		// Get the API route.
		$wp_rest_api_route = function_exists( 'rest_get_url_prefix' ) ? rest_get_url_prefix() : '';
		if ( ! empty( $wp_rest_api_route ) ) {
			$wp_rest_api_route = "/{$wp_rest_api_route}/wp/v2/";
		}

		// Enqueue the schedule script when needed.
		if ( ! empty( $post ) && has_shortcode( $post->post_content, 'print_conference_schedule_events' ) ) {

			wp_enqueue_script( 'conf-schedule-list', trailingslashit( plugin_dir_url( __FILE__ ) . 'assets/js' ) . 'conf-schedule-list.min.js', array( 'jquery', 'handlebars' ), null, true );
			wp_localize_script( 'conf-schedule-list', 'conf_sch', array(
				'ajaxurl'       => admin_url( 'admin-ajax.php' ),
				'wp_api_route'  => $wp_rest_api_route,
			));

		} elseif ( ! empty( $post ) && has_shortcode( $post->post_content, 'print_conference_schedule_speakers' ) ) {

			wp_enqueue_style( 'conf-schedule-speakers', trailingslashit( plugin_dir_url( __FILE__ ) . 'assets/css' ) . 'conf-schedule-speakers.min.css', array( 'conf-schedule-icons' ), null );
			wp_enqueue_script( 'conf-schedule-speakers', trailingslashit( plugin_dir_url( __FILE__ ) . 'assets/js' ) . 'conf-schedule-speakers.min.js', array( 'jquery', 'handlebars' ), null, true );

			wp_localize_script( 'conf-schedule-speakers', 'conf_sch', array(
				'ajaxurl'		=> admin_url( 'admin-ajax.php' ),
				'speaker_error' => sprintf( __( 'There seems to have been an issue collecting all of our wonderful speakers. Please refresh the page and try again. If the issue persists, please %1$slet us know%2$s.', 'conf-schedule' ), '<a href="/contact/">', '</a>' ),
			));

		} elseif ( is_singular( 'schedule' ) ) {

			// Enqueue our schedule styles.
			wp_enqueue_style( 'conf-schedule' );

			// Enqueue the schedule script.
			wp_enqueue_script( 'conf-schedule-single', trailingslashit( plugin_dir_url( __FILE__ ) . 'assets/js' ) . 'conf-schedule-single.min.js', array( 'jquery', 'handlebars' ), null, true );

			// Build data.
			$conf_sch_data = array(
				'post_id'       => $post->ID,
				'ajaxurl'       => admin_url( 'admin-ajax.php' ),
				'wp_api_route'  => $wp_rest_api_route,
				'schedule_url'  => '/schedule/',
				'view_schedule' => __( 'View schedule', 'conf-schedule' ),
			);

			// Get display field settings.
			$display_fields = conference_schedule()->get_schedule_display_fields();

			// Figure out which fields to display.
			if ( ! empty( $display_fields ) ) {

				// If we're set to view slides...
				if ( in_array( 'view_slides', $display_fields ) ) {
					$conf_sch_data['view_slides'] = __( 'View Slides', 'conf-schedule' );
				}

				// If we're set to view the livestream...
				if ( in_array( 'view_livestream', $display_fields ) ) {
					$conf_sch_data['view_livestream'] = __( 'View Livestream', 'conf-schedule' );
				}

				// If we're set to give feedback.
				if ( in_array( 'give_feedback', $display_fields ) ) {
					$conf_sch_data['give_feedback'] = __( 'Give Feedback', 'conf-schedule' );
				}

				// If we're set to watch the video.
				if ( in_array( 'watch_video', $display_fields ) ) {
					$conf_sch_data['watch_video'] = __( 'Watch Session', 'conf-schedule' );
				}
			}

			// Pass some data.
			wp_localize_script( 'conf-schedule-single', 'conf_sch', $conf_sch_data );

		} else {

			// Does this post have our shortcode?
			$has_schedule_shortcode = ! empty( $post ) && has_shortcode( $post->post_content, 'print_conference_schedule' );

			// If not the shortcode, do we want to add the schedule to the page?
			$add_schedule_to_page = ! $has_schedule_shortcode ? $this->add_schedule_to_page() : false;

			// Enqueue the schedule script when needed.
			if ( $has_schedule_shortcode || $add_schedule_to_page || $this->load_schedule ) {

				// Enqueue our schedule styles.
				wp_enqueue_style( 'conf-schedule' );

				// Enqueue the schedule script.
				wp_enqueue_script( 'conf-schedule', trailingslashit( plugin_dir_url( __FILE__ ) . 'assets/js' ) . 'conf-schedule.min.js', array( 'jquery', 'handlebars' ), null, true );
				
				/*
				 * Will show up 15 minutes before start.
				 * @TODO add setting to control.
		 		 */
		 		$session_livestream_reveal_delay_seconds = 900;

				// Build data.
				$conf_sch_data = array(
					'ajaxurl'          => admin_url( 'admin-ajax.php' ),
					'wp_api_route'     => $wp_rest_api_route,
					'jump_message'     => __( 'Go to current sessions', 'conf-schedule' ),
					'top_message'      => __( 'Go to top of schedule', 'conf-schedule' ),
					'watch_url'        => '/watch/',
					'watch_message'    => __( 'Watch sessions', 'conf-schedule' ),
					'speakers_url'     => '/speakers/',
					'speakers_message' => __( 'View speakers', 'conf-schedule' ),
					'reveal_delay'     => $session_livestream_reveal_delay_seconds,
				);

				// Get display field settings.
				$display_fields = conference_schedule()->get_schedule_display_fields();

				// Figure out which fields to display.
				if ( ! empty( $display_fields ) ) {

					// If we're set to view slides...
					if ( in_array( 'view_slides', $display_fields ) ) {
						$conf_sch_data['view_slides'] = __( 'View Slides', 'conf-schedule' );
					}

					// If we're set to view the livestream...
					if ( in_array( 'view_livestream', $display_fields ) ) {
						$conf_sch_data['view_livestream'] = __( 'View Livestream', 'conf-schedule' );
					}

					// If we're set to give feedback.
					if ( in_array( 'give_feedback', $display_fields ) ) {
						$conf_sch_data['give_feedback'] = __( 'Give Feedback', 'conf-schedule' );
					}

					// If we're set to watch the video.
					if ( in_array( 'watch_video', $display_fields ) ) {
						$conf_sch_data['watch_video'] = __( 'Watch Session', 'conf-schedule' );
					}
				}

				// Get this site's timezone.
				$timezone = $this->get_site_timezone();

				// Get the current time.
				$current_time = new DateTime( 'now', new DateTimeZone( $timezone ) );

				// Get the timezone offset.
				$current_time_offset = $current_time->getOffset();

				// Get the difference in hours.
				$timezone_offset_hours = ( abs( $current_time_offset ) / 60 ) / 60;

				// Pass the offset in hours.
				$conf_sch_data['tz_offset'] = ( $current_time_offset < 0 ) ? ( 0 - $timezone_offset_hours ) : $timezone_offset_hours;

				// Pass some translations.
				wp_localize_script( 'conf-schedule', 'conf_sch', $conf_sch_data );

			}
		}
	}

	/**
	 * Filter the content.
	 *
	 * @access  public
	 * @param	string - $the_content - the content
	 * @return	string - the filtered content
	 */
	public function the_content( $the_content ) {
		global $post;

		// For tweaking the single schedule pages.
		if ( is_singular( 'schedule' ) ) :

			// Get the settings.
			$settings = $this->get_settings();

			ob_start();

			// If we have pre HTML...
			if ( ! empty( $settings['pre_event_html'] ) ) :

				// Filter the message.
				$pre_html = apply_filters( 'conf_schedule_pre_event_message', $settings['pre_event_html'] );
				if ( ! empty( $pre_html ) ) :

					?>
					<div class="conf-sch-pre-event-message"><?php echo wpautop( $pre_html ); ?></div>
					<?php

				endif;
			endif;

			// Add content holders.
			?>
			<div id="conf-sch-single-livestream"></div>
			<div id="conf-sch-single-meta"></div>
			<?php

			// Print the content.
			echo $the_content;

			?>
			<div id="conf-sch-single-content">
				<p class="conf-schedule-single-loading"><?php _e( 'Loading the event...', 'conf-schedule' ); ?></p>
			</div>
			<?php

			// Embed the video.
			$video_url = get_post_meta( $post->ID, 'conf_sch_event_video_url', true );
			if ( ! empty( $video_url ) ) :

				// Get embed.
				$video_html = wp_oembed_get( $video_url, array(
					'height' => 450,
				));

				// Filter video html.
				$video_html = apply_filters( 'conf_schedule_session_video_html', $video_html, $video_url, $post->ID );
				if ( ! empty( $video_html ) ) :

					// Print embed.
					?>
					<div id="conf-sch-single-video">
						<h2><?php _e( 'Watch The Session', 'conf-schedule' ); ?></h2>
						<?php echo $video_html; ?>
					</div>
					<?php

				endif;
			endif;

			?>
			<h2 id="conf-sch-single-speakers-title"><?php _e( 'Speakers', 'conf-schedule' ); ?></h2>
			<div id="conf-sch-single-speakers" class="conf-schedule-speakers"></div>
			<?php

			// If we have post HTML...
			if ( ! empty( $settings['post_event_html'] ) ) :

				// Filter the message.
				$post_html = apply_filters( 'conf_schedule_post_event_message', $settings['post_event_html'] );
				if ( ! empty( $post_html ) ) :

					?>
					<div class="conf-sch-post-event-message"><?php echo wpautop( $post_html ); ?></div>
					<?php

				endif;
			endif;

			return ob_get_clean();

		endif;

		// If we want to add the schedule to a page...
		if ( $this->add_schedule_to_page() ) {

			// Add the schedule.
			$the_content .= $this->get_conference_schedule();

		}

		return $the_content;
	}

	/**
	 * Add handlebar templates to the footer when needed.
	 *
	 * @access  public
	 */
	public function print_handlebar_templates() {

		// Add the single event templates.
		if ( is_singular( 'schedule' ) ) :

			?>
			<script id="conf-sch-single-ls-template" type="text/x-handlebars-template">
				{{#if session_livestream_url}}<a href="{{session_livestream_url}}"><?php printf( __( 'This session is in progress. %1$sView the livestream%2$s', 'conf-schedule' ), '<strong><span class="underline">', '</span></strong>' ); ?></a>{{/if}}
			</script>
			<script id="conf-sch-single-content-template" type="text/x-handlebars-template">
				{{#if content.rendered}}{{{content.rendered}}}{{/if}}
			</script>
			<script id="conf-sch-single-meta-template" type="text/x-handlebars-template">
				{{#event_date_display}}<span class="event-meta event-date"><span class="event-meta-label"><?php _e( 'Date:', 'conf-schedule' ); ?></span> <span class="event-meta-value">{{.}}</span></span>{{/event_date_display}}
				{{#event_time_display_tz}}<span class="event-meta event-time"><span class="event-meta-label"><?php _e( 'Time:', 'conf-schedule' ); ?></span> <span class="event-meta-value">{{.}}</span></span>{{/event_time_display_tz}}
				{{#event_location}}<span class="event-meta event-location"><span class="event-meta-label"><?php _e( 'Location:', 'conf-schedule' ); ?></span> <span class="event-meta-value">{{#if permalink}}<a href="{{permalink}}">{{/if}}{{post_title}}{{#if permalink}}</a>{{/if}}</span></span>{{/event_location}}
				{{#if subjects}}<span class="event-meta event-subjects"><span class="event-meta-label"><?php _e( 'Subjects:', 'conf-schedule' ); ?></span> <span class="event-meta-value">{{#each subjects}}{{#unless @first}}, {{/unless}}{{name}}{{/each}}</span></span>{{/if}}
				{{#event_links}}{{body}}{{/event_links}}
			</script>
			<script id="conf-sch-single-speakers-template" type="text/x-handlebars-template">
				<div class="conf-schedule-speaker">
					<h3 class="speaker-name">{{{title.rendered}}}</h3>
					{{#if headshot}}<img class="speaker-headshot" src="{{headshot}}" alt="{{display_name}}" />{{/if}}
					{{{speaker_meta}}}
					{{#if website}}
						<div class="speaker-website"><a href="{{website}}">{{website}}</a></div>
					{{/if}}
					{{{speaker_social}}}
					{{#if content.rendered}}
						<div class="speaker-bio">
							{{{content.rendered}}}
						</div>
					{{/if}}
				</div>
			</script>
			<?php

		endif;

		if ( $this->print_events_list ) :
			?>
			<script id="conf-schedule-events-list-template" type="text/x-handlebars-template">
				<li>{{#if link}}<a href="{{link}}">{{/if}}{{#if title.rendered}}{{{title.rendered}}}{{/if}}{{#if link}}</a>{{/if}}</li>
			</script>
			<?php
		endif;

		if ( $this->print_speakers_list ) :
			?>
			<script id="conf-schedule-speakers-list-template" type="text/x-handlebars-template">
				{{#each .}}
					<div id="speaker{{id}}" class="conf-schedule-speaker">
						<h2 class="speaker-name">{{{title.rendered}}}</h2>
						{{#if headshot}}<img class="speaker-headshot" src="{{headshot}}" alt="Headshot of {{title.rendered}}">{{/if}}
						{{speaker_meta}}
						{{#if website}}
							<div class="speaker-website"><a href="{{website}}">{{website}}</a></div>
						{{/if}}
						{{speaker_social}}
						{{#if content.rendered}}
							<div class="speaker-bio">
								{{{content.rendered}}}
							</div>
						{{/if}}
						{{speaker_sessions}}
					</div>
				{{/each}}
			</script>
			<?php
		endif;
	}

	/**
	 * Registers our plugins's custom post types.
	 *
	 * @access  public
	 */
	public function register_custom_post_types() {

		// Define the labels for the locations CPT.
		$locations_labels = apply_filters( 'conf_schedule_locations_cpt_labels', array(
			'name'                  => _x( 'Locations', 'Post Type General Name', 'conf-schedule' ),
			'singular_name'         => _x( 'Location', 'Post Type Singular Name', 'conf-schedule' ),
			'menu_name'             => __( 'Locations', 'conf-schedule' ),
			'name_admin_bar'        => __( 'Locations', 'conf-schedule' ),
			'archives'              => __( 'Locations', 'conf-schedule' ),
			'all_items'             => __( 'All Locations', 'conf-schedule' ),
			'add_new_item'          => __( 'Add New Location', 'conf-schedule' ),
			'new_item'              => __( 'New Location', 'conf-schedule' ),
			'edit_item'             => __( 'Edit Location', 'conf-schedule' ),
			'update_item'           => __( 'Update Location', 'conf-schedule' ),
			'view_item'             => __( 'View Location', 'conf-schedule' ),
			'search_items'          => __( 'Search Locations', 'conf-schedule' ),
			'not_found'             => __( 'No locations found.', 'conf-schedule' ),
			'not_found_in_trash'    => __( 'No locations found in Trash', 'conf-schedule' ),
		));

		// Define the args for the locations CPT.
		$locations_args = apply_filters( 'conf_schedule_locations_cpt_args', array(
			'label'                 => __( 'Locations', 'conf-schedule' ),
			'description'           => __( 'The locations content for your conference.', 'conf-schedule' ),
			'labels'                => $locations_labels,
			'public'                => true,
			'hierarchical'          => false,
			'supports'              => array( 'title', 'editor', 'thumbnail', 'excerpt', 'revisions' ),
			'has_archive'           => true,
			'menu_icon'             => 'dashicons-location',
			'can_export'            => true,
			'capability_type'       => 'post',
			'show_in_menu'			=> 'edit.php?post_type=schedule',
			'show_in_rest'			=> true,
			'rewrite'           => array(
				'slug'          => 'locations',
				'with_front'    => false,
				'pages'         => false,
			),
		));

		// Register the locations custom post type.
		register_post_type( 'locations', $locations_args );

	}

	/**
	 * Returns true if, setting wise,
	 * we should add the schedule to the current page.
	 *
	 * @access  public
	 * @return	string - the schedule
	 */
	public function add_schedule_to_page() {
		global $post;

		// Make sure we have an ID and a post type.
		if ( empty( $post->ID ) || empty( $post->post_type ) ) {
			return false;
		}

		// We only add to pages.
		if ( 'page' != $post->post_type ) {
			return false;
		}

		// Get settings.
		$settings = $this->get_settings();

		// If we want to add the schedule to this page...
		if ( ! empty( $settings['schedule_add_page'] ) && $settings['schedule_add_page'] > 0 ) {

			if ( $post->ID == $settings['schedule_add_page'] ) {

				// Add the schedule.
				return true;

			}
		}

		return false;
	}

	/**
	 * Get the conference schedule.
	 *
	 * @access  public
	 * @return	string - the schedule
	 */
	public function get_conference_schedule( $args = array() ) {

		ob_start();

		// Get settings.
		$settings = $this->get_settings();

		// Merge incoming with settings.
		$settings = wp_parse_args( $args, $settings );

		?>
		<div id="conference-schedule-container" class="loading"<?php echo ! empty( $settings['date'] ) ? ' data-date="' . $settings['date'] . '"' : null; ?>>
			<?php

			// If we have pre HTML...
			if ( ! empty( $settings['pre_html'] ) ) :

				// Filter the message.
				$pre_html = apply_filters( 'conf_schedule_pre_schedule_message', $settings['pre_html'] );
				if ( ! empty( $pre_html ) ) :

					?>
					<div class="schedule-pre-message"><?php echo wpautop( $pre_html ); ?></div>
					<?php

				endif;
			endif;

			?>
			<div id="conference-schedule"></div>
			<?php

			// If we have post HTML...
			if ( ! empty( $settings['post_html'] ) ) :

				// Filter the message.
				$post_html = apply_filters( 'conf_schedule_post_schedule_message', $settings['post_html'] );
				if ( ! empty( $post_html ) ) :

					?>
					<div class="schedule-post-message"><?php echo wpautop( $post_html ); ?></div>
					<?php

				endif;
			endif;

			?>
			<script id="conference-schedule-template" type="text/x-handlebars-template">
				<div id="conf-sch-event-{{id}}" class="schedule-event{{#if event_parent}} event-child{{/if}}{{#event_type}} {{.}}{{/event_type}}">
					{{#event_time_display}}<div class="event-time">{{.}}</div>{{/event_time_display}}
					{{#title}}{{body}}{{/title}}
					{{#event_location}}<div class="event-location">{{#if permalink}}<a href="{{permalink}}">{{/if}}{{post_title}}{{#if permalink}}</a>{{/if}}</div>{{/event_location}}
					{{#if event_address}}<div class="event-address">{{#if event_google_maps_url}}<a href="{{event_google_maps_url}}">{{/if}}{{event_address}}{{#if event_google_maps_url}}</a>{{/if}}</div>{{/if}}
					{{#if speakers}}<div class="event-speakers">{{#each speakers}}<div class="event-speaker">{{display_name}}</div>{{/each}}</div>{{/if}}
					{{#if subjects}}<div class="event-subjects">{{#each subjects}}{{#unless @first}}, {{/unless}}{{name}}{{/each}}</div>{{/if}}
					<div class="event-links">
						{{#event_links}}{{body}}{{/event_links}}
						{{#social_media}}{{body}}{{/social_media}}
					</div>
				</div>
			</script>
		</div>
		<?php

		/*// What time is it?
		$current_time = new DateTime( 'now', new DateTimeZone( 'America/Chicago' ) );

		?><div class="schedule-main-buttons-wrapper">
			<a href="#" class="btn btn-primary go-to-current-event">Go To Current Event</a>
			</div><?php

			foreach ( $schedule_data as $day_key => $day ) {

				// Create the date for this day
				$day_date = new DateTime( $day_key, new DateTimeZone( 'America/Chicago' ) );

				// Has this date passed?
				//$day_has_passed = $day_date->format( 'j' ) < $current_time->format( 'j' );

				// Wrap in collapsible block
				*//*if ( $day_has_passed ) {
					echo '<div class="collapsible-schedule-block">';
				}*//*

				// Wrap in collapsible block
				*//*if ( $day_has_passed ) {
					echo '</div>';
				}*//*

			}

		?></div><?php */

		return ob_get_clean();
	}

	/**
	 * Get the conference schedule events.
	 *
	 * @access  public
	 * @return  string - the schedule
	 */
	public function get_conference_schedule_events( $args = array() ) {

		// Merge incoming with defaults.
		$args = wp_parse_args( $args, array(
			'date'  => null,
			'event' => null,
		));

		$data_attributes_str = '';
		$data_attributes = array();

		//  Make sure arguments are valid.
		if ( ! empty( $args['date'] ) ) {
			$data_attributes['date'] = sanitize_text_field( $args['date'] );
		}

		if ( ! empty( $args['event'] ) ) {
			$args['event'] = sanitize_text_field( $args['event'] );
			if ( ! empty( $args['event'] ) && is_numeric( $args['event'] ) ) {
				$data_attributes['event'] = $args['event'];
			}
		}

		if ( ! empty( $data_attributes ) ) {
			foreach ( $data_attributes as $key => $value ) {
				$data_attributes_str .= ' data-' . $key . '="' . $value . '"';
			}
		}

		$this->print_events_list = true;

		ob_start();

		?>
		<ul class="conf-schedule-events"<?php echo $data_attributes_str; ?>></ul>
		<?php

		return ob_get_clean();
	}



	/**
	 * Get the conference schedule speakers.
	 *
	 * @access  public
	 * @return  string - the schedule
	 */
	public function get_conference_schedule_speakers( $args = array() ) {

		// Merge incoming with defaults.
		$args = wp_parse_args( $args, array(
			'date'  => null,
			'event' => null,
		));

		$data_attributes_str = '';
		$data_attributes = array();

		//  Make sure arguments are valid.
		if ( ! empty( $args['date'] ) ) {
			$data_attributes['date'] = sanitize_text_field( $args['date'] );
		}
		if ( ! empty( $args['event'] ) ) {
			$args['event'] = sanitize_text_field( $args['event'] );
			if ( ! empty( $args['event'] ) && is_numeric( $args['event'] ) ) {
				$data_attributes['event'] = $args['event'];
			}
		}

		if ( ! empty( $data_attributes ) ) {
			foreach ( $data_attributes as $key => $value ) {
				$data_attributes_str .= ' data-' . $key . '="' . $value . '"';
			}
		}

		$this->print_speakers_list = true;

		ob_start();

		?>
		<div id="conf-schedule-speakers" class="conf-schedule-speakers"<?php echo $data_attributes_str; ?>>
			<p class="conf-schedule-speakers-loading"><?php _e( 'Loading speakers...', 'conf-schedule' ); ?></p>
		</div>
		<?php

		return ob_get_clean();

	}

	/**
	 * Returns the [print_conference_schedule] shortcode content.
	 *
	 * @access  public
	 * @param   array - $args - arguments passed to the shortcode
	 * @return  string - the content for the shortcode
	 */
	public function conference_schedule_shortcode( $args = array() ) {

		$args = shortcode_atts( array(
			'date' => null,
		), $args, 'print_conference_schedule' );

		return conference_schedule()->get_conference_schedule( $args );
	}

	/**
	 * Returns the [print_conference_schedule_events] shortcode content.
	 *
	 * @access  public
	 * @param   array - $args - arguments passed to the shortcode
	 * @return  string - the content for the shortcode
	 */
	public function conference_schedule_events_shortcode( $args = array() ) {

		$args = shortcode_atts( array(
			'date'  => null,
			'event' => null,
		), $args, 'print_conference_schedule_events' );

		return conference_schedule()->get_conference_schedule_events( $args );
	}

	/**
	 * Returns the [print_conference_schedule_speakers] shortcode content.
	 *
	 * @access  public
	 * @param   array - $args - arguments passed to the shortcode
	 * @return  string - the content for the shortcode
	 */
	public function conference_schedule_speakers_shortcode( $args = array() ) {

		$args = shortcode_atts( array(
			'date'  => null,
			'event' => null,
		), $args, 'print_conference_schedule_speakers' );

		return conference_schedule()->get_conference_schedule_speakers( $args );
	}

	/**
	 * Get the speakers via an AJAX request.
	 */
	public function ajax_get_speakers() {

		$speakers_args = array();

		// Add date query.
		$date = isset( $_GET['date'] ) ? sanitize_text_field( $_GET['date'] ) : '';
		if ( ! empty( $date ) ) {
			$speakers_args['date'] = $date;
		}

		// Add event query.
		$event = isset( $_GET['event'] ) ? sanitize_text_field( $_GET['event'] ) : '';
		if ( ! empty( $event ) && is_numeric( $event ) ) {
			$speakers_args['event'] = $event;
		}

		$speakers = $this->get_speakers( $speakers_args );

		echo json_encode( $speakers );

		wp_die();
	}

	/**
	 * Get the schedule items.
	 */
	public function get_schedule( $args = array() ) {

		// Merge incoming with defaults.
		$args = wp_parse_args( $args, array(
			'date'          => null,
			'per_page'      => 100,
			'bust_cache'    => false,
		));

		if ( ! empty( $args['date'] ) ) {
			$args['date'] = sanitize_text_field( $args['date'] );
		}

		$transient_name = 'wpc_schedule';
		if ( ! empty( $args['date'] ) ) {
			$transient_name .= '_' . $args['date'];
		}

		// Check the transient.
		if ( ! $args['bust_cache'] || empty( $_GET['wpc_cache'] ) || 'bust' !== $_GET['wpc_cache'] ) {
			$stored_schedule = get_transient( $transient_name );
			if ( false !== $stored_schedule && is_array( $stored_schedule ) ) {
				return $stored_schedule;
			}
		}

		$api_root = get_bloginfo( 'url' );
		if ( empty( $api_root ) ) {
			return false;
		}

		// Build parameters for query.
		$url_params = array(
			'per_page' => ! empty( $args['per_page'] ) && is_numeric( $args['per_page'] ) ? $args['per_page'] : 100,
			'conf_sch_event_type' => 'session',
		);

		// Add date to limit query.
		if ( ! empty( $args['date'] ) ) {
			$url_params['conf_sch_event_date'] = $args['date'];
		}

		// Build query URL.
		$url = add_query_arg( $url_params, $api_root . '/wp-json/wp/v2/schedule' );

		// Get the schedule.
		$response = wp_remote_get( $url );

		if ( 200 != wp_remote_retrieve_response_code( $response ) ) {
			return array();
		}

		$schedule = wp_remote_retrieve_body( $response );
		if ( empty( $schedule ) ) {
			return array();
		}

		$schedule = json_decode( $schedule );

		// Store for a day.
		set_transient( $transient_name, $schedule, DAY_IN_SECONDS );

		return $schedule;
	}

	/**
	 * Is used to get speakers for speakers page.
	 */
	public function get_speakers( $args = array() ) {

		// Merge incoming with defaults.
		$args = wp_parse_args( $args, array(
			'date'              => null,
			'event'             => null,
			'per_page'          => 100,
			'bust_cache'        => false,
		));

		if ( ! empty( $args['date'] ) ) {
			$args['date'] = sanitize_text_field( $args['date'] );
		}

		$transient_name = 'wpc_speakers';
		if ( ! empty( $args['date'] ) ) {
			$transient_name .= '_' . $args['date'];
		}

		// Check the transient.
		if ( ! $args['bust_cache'] || empty( $_GET['wpc_cache'] ) || 'bust' !== $_GET['wpc_cache'] ) {
			$stored_speakers = get_transient( $transient_name );
			if ( false !== $stored_speakers && is_array( $stored_speakers ) ) {
				return $stored_speakers;
			}
		}

		// Build parameters for schedule.
		$schedule_args = array();

		if ( ! empty( $args['date'] ) ) {
			$schedule_args['date'] = $args['date'];
		}

		$schedule = $this->get_schedule( $schedule_args );

		if ( empty( $schedule ) ) {
			return array();
		}

		// Process the schedule to organize by proposal.
		$proposal_ids = array();

		// Get schedule proposal IDs.
		foreach ( $schedule as $item ) {
			if ( ! empty( $item->proposal ) ) {
				$proposal_ids[] = $item->proposal;
			}
		}

		// Build proposal args.
		$proposal_args = array();

		if ( ! empty( $proposal_ids ) ) {
			$proposal_args['post__in'] = $proposal_ids;
		}

		// Make sure events are IDs.
		if ( ! empty( $args['event'] ) ) {

			// Make sure its an array.
			if ( ! is_array( $args['event'] ) ) {
				$args['event'] = explode( ',', $args['event'] );
			}

			// Sanitize the array.
			$args['event'] = array_filter( $args['event'], 'is_numeric' );

			// Add to args.
			$proposal_args['event'] = implode( ',', $args['event'] );

		}

		// Get the proposals.
		$proposals = $this->get_proposals( $proposal_args );

		if ( empty( $proposals ) ) {
			return array();
		}

		// Group proposal by ID.
		$proposals_by_id = array();
		foreach ( $proposals as $proposal ) {
			if ( ! empty( $proposal->id ) ) {
				$proposals_by_id[ "proposal{$proposal->id}" ] = $proposal;
			}
		}

		// Go through schedule and round up our speakers.
		$speakers = array();

		foreach ( $schedule as $item ) {
			if ( ! empty( $item->proposal ) ) {

				if ( empty( $proposals_by_id[ "proposal{$item->proposal}" ] ) ) {
					continue;
				}

				$proposal = $proposals_by_id[ "proposal{$item->proposal}" ];

				if ( empty( $proposal->speakers ) ) {
					continue;
				}

				// Prepare session info.
				$session = array(
					'link'  => $item->link,
					'title' => $proposal->title->rendered,
				);

				// Add each speaker and add its session info.
				foreach ( $proposal->speakers as $speaker ) {
					if ( empty( $speaker->id ) ) {
						continue;
					}

					$speaker_key = "speaker{$speaker->id}";

					if ( ! isset( $speakers[ $speaker_key ] ) ) {

						// Store session.
						$speaker->sessions = array( $session );

						$speakers[ $speaker_key ] = $speaker;

					} else {
						$speakers[ $speaker_key ]->sessions[] = $session;
					}
				}
			}
		}

		// Sort by last name alphabetically.
		usort( $speakers, function( $a, $b ) {
			if ( $a->last_name == $b->last_name ) {
				return 0;
			}
			return ( $a->last_name < $b->last_name ) ? -1 : 1;
		});

		return $speakers;
	}

	/**
	 * Request profile information.
	 */
	public function get_profiles( $args = array() ) {

		// Merge incoming with defaults.
		$args = wp_parse_args( $args, array(
			'event'             => null,
			'per_page'          => 100,
			'by_proposal_id'    => array(),
			'proposal_status'   => null,
			'bust_cache'        => false,
		));

		// Make sure events are IDs.
		if ( ! empty( $args['event'] ) ) {

			// Make sure its an array.
			if ( ! is_array( $args['event'] ) ) {
				$args['event'] = explode( ',', $args['event'] );
			}

			// Sanitize the array.
			$args['event'] = array_filter( $args['event'], 'is_numeric' );
			$args['event'] = implode( ',', $args['event'] );

		}

		$transient_name = 'wpc_profiles';
		if ( ! empty( $args['event'] ) ) {
			$transient_name .= '_' . $args['event'];
		}

		// Check the transient.
		if ( ! $args['bust_cache'] || empty( $_GET['wpc_cache'] ) || 'bust' !== $_GET['wpc_cache'] ) {
			$stored_profiles = get_transient( $transient_name );
			if ( false !== $stored_profiles && is_array( $stored_profiles ) ) {
				return $stored_profiles;
			}
		}

		$http_wpc_access = get_option( 'http_wpc_access' );
		if ( empty( $http_wpc_access ) ) {
			return array();
		}

		$api_root = get_option( 'wpc_api_root' );
		if ( empty( $api_root ) ) {
			return array();
		}

		// Build parameters for query.
		$url_params = array(
			'per_page' => ! empty( $args['per_page'] ) && is_numeric( $args['per_page'] ) ? $args['per_page'] : 100,
		);

		// Add event ID to limit query.
		if ( ! empty( $args['event'] ) ) {
			$url_params['proposal_event'] = $args['event'];
		}

		// Add proposal IDs query.
		if ( ! empty( $args['by_proposal_id'] ) ) {

			// Make sure it's an array.
			if ( ! is_array( $args['by_proposal_id'] ) ) {
				$args['by_proposal_id'] = explode( ',', str_replace( ' ', '', $args['by_proposal_id'] ) );
			}

			$args['by_proposal_id'] = array_filter( $args['by_proposal_id'], 'is_numeric' );

			if ( ! empty( $args['by_proposal_id'] ) ) {
				$url_params['by_proposal_id'] = implode( ',', str_replace( ' ', '', $args['by_proposal_id'] ) );
			}
		}

		// Add proposal status.
		if ( ! empty( $args['proposal_status'] ) ) {
			$url_params['proposal_status'] = strtolower( implode( ',', str_replace( ' ', '', $args['proposal_status'] ) ) );
		}

		// Build query URL.
		$url = add_query_arg( $url_params, $api_root . 'profile' );

		// Get our profiles.
		$response = wp_remote_get( $url, array(
			'headers' => array(
				'WPC-Access' => $http_wpc_access,
			),
		));

		if ( 200 != wp_remote_retrieve_response_code( $response ) ) {
			return array();
		}

		$profiles = wp_remote_retrieve_body( $response );
		if ( empty( $profiles ) ) {
			return array();
		}

		$profiles = json_decode( $profiles );

		// Store for a day.
		set_transient( $transient_name, $profiles, DAY_IN_SECONDS );

		return $profiles;
	}

	/**
	 * Get the proposals via an AJAX request.
	 */
	public function ajax_get_proposals() {

		$proposal_args = array();

		// Add event query.
		$event = isset( $_GET['event'] ) ? sanitize_text_field( $_GET['event'] ) : '';
		if ( ! empty( $event ) ) {
			$proposal_args['event'] = $event;
		}

		$proposals = $this->get_proposals( $proposal_args );

		echo json_encode( $proposals );

		wp_die();
	}

	/**
	 * Get a specfic proposal via an AJAX request.
	 */
	public function ajax_get_proposal() {

		// Make sure we have an ID.
		$proposal_id = ! empty( $_GET['proposal_id'] ) ? sanitize_text_field( $_GET['proposal_id'] ) : 0;

		$proposal = $proposal_id > 0 ? $this->get_proposal( $proposal_id ) : 0;

		echo json_encode( $proposal );

		wp_die();
	}

	/**
	 * Request proposal information.
	 */
	public function get_proposals( $args = array() ) {

		// Merge incoming with defaults.
		$args = wp_parse_args( $args, array(
			'event'             => '',
			'post__in'          => array(),
			'per_page'          => 100,
			'proposal_status'   => null,
			'bust_cache'        => false,
		));

		// Make sure events are IDs.
		if ( ! empty( $args['event'] ) ) {

			// Make sure its an array.
			if ( ! is_array( $args['event'] ) ) {
				$args['event'] = explode( ',', $args['event'] );
			}

			// Sanitize the array.
			$args['event'] = array_filter( $args['event'], 'is_numeric' );
			$args['event'] = implode( ',', $args['event'] );

		}

		$transient_name = 'wpc_proposals';
		if ( ! empty( $args['event'] ) ) {
			$transient_name .= '_' . $args['event'];
		}

		// Check the transient.
		if ( ! $args['bust_cache'] || empty( $_GET['wpc_cache'] ) || 'bust' !== $_GET['wpc_cache'] ) {
			$stored_proposals = get_transient( $transient_name );
			if ( false !== $stored_proposals && is_array( $stored_proposals ) ) {
				return $stored_proposals;
			}
		}

		$http_wpc_access = get_option( 'http_wpc_access' );
		if ( empty( $http_wpc_access ) ) {
			return array();
		}

		$api_root = get_option( 'wpc_api_root' );
		if ( empty( $api_root ) ) {
			return array();
		}

		// Build parameters for query.
		$url_params = array(
			'per_page' => ! empty( $args['per_page'] ) && is_numeric( $args['per_page'] ) ? $args['per_page'] : 100,
		);

		// Add event ID to limit query.
		if ( ! empty( $args['event'] ) ) {
			$url_params['event'] = $args['event'];
		}

		// Add proposal status.
		if ( ! empty( $args['proposal_status'] ) ) {
			$url_params['proposal_status'] = strtolower( implode( ',', str_replace( ' ', '', $args['proposal_status'] ) ) );
		}

		// Make sure events are IDs.
		if ( ! empty( $args['post__in'] ) ) {

			// Make sure its an array.
			if ( ! is_array( $args['post__in'] ) ) {
				$args['post__in'] = explode( ',', $args['post__in'] );
			}

			// Sanitize the array.
			$args['post__in'] = array_filter( $args['post__in'], 'is_numeric' );
			$url_params['post__in'] = implode( ',', $args['post__in'] );

		}

		// Build query URL.
		$url = add_query_arg( $url_params, $api_root . 'proposal' );

		// Get our proposals.
		$response = wp_remote_get( $url, array(
			'headers' => array(
				'WPC-Access' => $http_wpc_access,
			),
		));

		if ( 200 != wp_remote_retrieve_response_code( $response ) ) {
			return array();
		}

		$proposals = wp_remote_retrieve_body( $response );
		if ( empty( $proposals ) ) {
			return array();
		}

		$proposals = json_decode( $proposals );

		// Store for a day.
		set_transient( $transient_name, $proposals, DAY_IN_SECONDS );

		return $proposals;
	}

	/**
	 * Request information for a specific proposal.
	 */
	public function get_proposal( $proposal_id, $bust_cache = false ) {

		$transient_name = "wpc_proposal_{$proposal_id}";

		// Check the transient.
		if ( ! $bust_cache || empty( $_GET['wpc_cache'] ) || 'bust' !== $_GET['wpc_cache'] ) {
			$stored_proposal = get_transient( $transient_name );
			if ( false !== $stored_proposal ) {
				return $stored_proposal;
			}
		}

		$http_wpc_access = get_option( 'http_wpc_access' );
		if ( empty( $http_wpc_access ) ) {
			return array();
		}

		$api_root = get_option( 'wpc_api_root' );
		if ( empty( $api_root ) ) {
			return array();
		}

		$url = $api_root . 'proposal/' . $proposal_id;

		// Get our proposal.
		$response = wp_remote_get( $url, array(
			'headers' => array(
				'WPC-Access' => $http_wpc_access,
			),
		));

		if ( 200 != wp_remote_retrieve_response_code( $response ) ) {
			return array();
		}

		$proposal = wp_remote_retrieve_body( $response );
		if ( empty( $proposal ) ) {
			return array();
		}

		$proposal = json_decode( $proposal );

		// Store for a day.
		set_transient( $transient_name, $proposal, DAY_IN_SECONDS );

		return $proposal;
	}

	/**
	 * Process the schedule post type when it's saved.
	 *
	 * We'll use this hook to make sure the title and
	 * slug are updated when proposals are selected.
	 *
	 * @TODO: Update the content and excerpt?
	 */
	public function process_schedule_save( $post_id, $post, $update ) {

		// Only need to process sessions.
		$event_type = get_post_meta( $post_id, 'event_type', true );
		if ( 'session' != $event_type ) {
			return;
		}

		// Only need to process if it has a proposal ID.
		$proposal_id = get_post_meta( $post_id, 'proposal', true );
		if ( ! $proposal_id || ! is_numeric( $proposal_id ) ) {
			return;
		}

		// Get the proposal information.
		$proposal = $this->get_proposal( $proposal_id, true );

		// Build post info to edit.
		$post_update = array();

		// Set with proposal title.
		if ( ! empty( $proposal->title->rendered ) ) {
			$post_update['post_title'] = $proposal->title->rendered;
		}

		// Set with proposal slug.
		if ( ! empty( $proposal->slug ) ) {
			$post_update['post_name'] = $proposal->slug;
		}

		if ( ! empty( $post_update ) ) {

			// Add post ID.
			$post_update['ID'] = $post_id;

			// Unhook this function so it doesn't infinite loop.
			remove_action( 'save_post_schedule', array( $this, 'process_schedule_save' ) );

			// Update the post, which calls save_post again.
			wp_update_post( $post_update );

			// Re-hook this function.
			add_action( 'save_post_schedule', array( $this, 'process_schedule_save' ) );

		}
	}
}

/**
 * Returns the instance of our main Conference_Schedule class.
 *
 * Will come in handy when we need to access the
 * class to retrieve data throughout the plugin.
 *
 * @access	public
 * @return	Conference_Schedule
 */
function conference_schedule() {
	return Conference_Schedule::instance();
}

// Let's get this show on the road.
conference_schedule();
