<?php

/**
 * Holds the back-end admin
 * functionality for the plugin.
 */
class Conference_Schedule_Admin {

	/**
	 * ID of the settings page
	 *
	 * @since   1.0.0
	 * @access  public
	 * @var     string
	 */
	public $settings_page_id;

	/**
	 * Holds the class instance.
	 *
	 * @since	1.0.0
	 * @access	private
	 * @var		Conference_Schedule_Admin
	 */
	private static $instance;

	/**
	 * Returns the instance of this class.
	 *
	 * @access  public
	 * @since   1.0.0
	 * @return	Conference_Schedule_Admin
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

		// Return data to AJAX.
		add_action( 'wp_ajax_conf_sch_get_speakers', array( $this, 'ajax_get_speakers' ) );
		add_action( 'wp_ajax_conf_sch_get_users', array( $this, 'ajax_get_users' ) );
		add_action( 'wp_ajax_conf_sch_get_terms', array( $this, 'ajax_get_terms' ) );
		add_action( 'wp_ajax_conf_sch_get_posts', array( $this, 'ajax_get_posts' ) );
		add_action( 'wp_ajax_conf_sch_get_events', array( $this, 'ajax_get_events' ) );

		// Add styles and scripts for the tools page.
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_styles_scripts' ), 20 );

		// Add regular settings page.
		add_action( 'admin_menu', array( $this, 'add_settings_page' ) );

		// Register our settings.
		add_action( 'admin_init', array( $this, 'register_settings' ), 1 );

		// Add our settings meta boxes.
		add_action( 'admin_head-schedule_page_conf-schedule-settings', array( $this, 'add_settings_meta_boxes' ) );

		// Add instructions to thumbnail admin meta box.
		add_filter( 'admin_post_thumbnail_html', array( $this, 'filter_admin_post_thumbnail_html' ), 100, 2 );

		// Add admin notices.
		add_action( 'admin_notices', array( $this, 'print_admin_notice' ) );

		// Add meta boxes.
		add_action( 'add_meta_boxes', array( $this, 'add_meta_boxes' ), 1, 2 );

		// Remove meta boxes.
		add_action( 'admin_menu', array( $this, 'remove_meta_boxes' ), 100 );

		// Save meta box data.
		add_action( 'save_post', array( $this, 'save_meta_box_data' ), 20, 3 );

		// Set it up so we can do file uploads.
		add_action( 'post_edit_form_tag' , array( $this, 'post_edit_form_tag' ) );

		// Add custom columns.
		add_filter( 'manage_posts_columns', array( $this, 'add_posts_columns' ), 10, 2 );

		// Populate our custom admin columns.
		add_action( 'manage_schedule_posts_custom_column', array( $this, 'populate_posts_columns' ), 10, 2 );
		add_action( 'manage_speakers_posts_custom_column', array( $this, 'populate_posts_columns' ), 10, 2 );

		// Populate ACF field choices.
		add_filter( 'acf/load_field/name=proposal', array( $this, 'load_proposal_field_choices' ) );

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
	 * Print list of speakers in JSON for AJAX.
	 *
	 * @since   1.0.0
	 * @access  public
	 * @return  void
	 */
	public function ajax_get_speakers() {

		// Get post statuses.
		$post_statuses = get_post_stati();

		// Remove the ones we don't want.
		foreach ( array( 'auto-draft', 'inherit', 'private', 'trash' ) as $status ) {
			if ( isset( $post_statuses[ $status ] ) ) {
				unset( $post_statuses[ $status ] );
			}
		}

		// Get list of speakers.
		$speakers = get_posts( array(
			'post_type'         => 'speakers',
			'posts_per_page'    => -1,
			'orderby'           => 'title',
			'order'             => 'ASC',
			'post_status'       => $post_statuses,
		));

		if ( empty( $speakers ) ) {
			echo json_encode( array() );
		} else {

			// Will hold selected speaker IDs.
			$selected = array();

			/*
			 * If we passed a schedule post ID,
			 * get the selected speakers.
			 */
			$schedule_post_id = isset( $_GET['schedule_post_id'] ) ? $_GET['schedule_post_id'] : 0;
			if ( $schedule_post_id > 0 ) {

				// Get the selected speakers.
				$selected = get_post_meta( $schedule_post_id, 'conf_sch_event_speaker', false );

				// If selected, add to speakers data.
				if ( ! empty( $selected ) ) {
					foreach ( $speakers as $speaker ) {
						$speaker->is_selected = in_array( $speaker->ID, $selected );
					}
				}
			}

			// Print the speakers data.
			echo json_encode( $speakers );

		}

		wp_die();
	}

	/**
	 * Print list of users in JSON for AJAX.
	 *
	 * @since   1.0.0
	 * @access  public
	 * @return  void
	 */
	public function ajax_get_users() {

		// Get list of users.
		$users = get_users( array( 'orderby' => 'display_name' ) );
		if ( ! empty( $users ) ) {

			// Build user data.
			$user_data = array(
				'selected'  => 0,
				'users'     => $users,
			);

			/*
			 * If we passed a speaker post ID, get the
			 * user ID assigned to the speaker post ID.
			 */
			$speaker_post_id = isset( $_GET['speaker_post_id'] ) ? $_GET['speaker_post_id'] : 0;
			if ( $speaker_post_id > 0 ) {

				// Get the assigned user ID for the speaker.
				$speaker_user_id = get_post_meta( $speaker_post_id, 'conf_sch_speaker_user_id', true );
				if ( $speaker_user_id > 0 ) {
					$user_data['selected'] = $speaker_user_id;
				}
			}

			// Print the user data.
			echo json_encode( $user_data );

		}

		wp_die();
	}

	/**
	 * Print terms in JSON for AJAX.
	 *
	 * @since   1.0.0
	 * @access  public
	 * @return  void
	 */
	public function ajax_get_terms() {

		// Get taxonomy name.
		$taxonomy_name = isset( $_GET['taxonomy'] ) ? $_GET['taxonomy'] : '';
		if ( ! empty( $taxonomy_name ) ) {

			// If we have a post ID, then get selected terms.
			$post_id = isset( $_GET['post_id'] ) ? $_GET['post_id'] : 0;
			$selected_terms = $post_id ? wp_get_object_terms( $post_id, $taxonomy_name, array( 'fields' => 'ids' ) ) : array();

			// Get terms.
			$terms = get_terms( array(
				'taxonomy'      => $taxonomy_name,
				'hide_empty'    => false,
				'orderby'       => 'name',
				'order'         => 'ASC',
				'fields'        => 'all',
			));

			// Print the terms.
			if ( ! empty( $terms ) && ! is_wp_error( $terms ) ) {

				// Mark selected terms.
				if ( ! empty( $selected_terms ) ) {
					foreach ( $terms as $term ) {
						$term->is_selected = in_array( $term->term_id, $selected_terms );
					}
				}

				echo json_encode( $terms );

			} else {
				echo json_encode( array() );
			}
		}

		wp_die();
	}

	/**
	 * Print posts in JSON for AJAX.
	 *
	 * @since   1.0.0
	 * @access  public
	 * @return  void
	 */
	public function ajax_get_posts() {

		// Get post type.
		$post_type = isset( $_GET['post_type'] ) ? $_GET['post_type'] : '';
		if ( ! empty( $post_type ) ) {

			// Get the posts.
			$posts = get_posts( array(
				'post_type'         => $post_type,
				'posts_per_page'    => -1,
				'post_status'       => array( 'publish', 'future', 'draft', 'pending' ),
				'orderby'           => 'title',
				'order'             => 'ASC',
				'suppress_filters'  => true,
			));
			if ( ! empty( $posts ) ) {

				// If we have a post ID and meta key, then get selected posts.
				$post_id = isset( $_GET['post_id'] ) ? $_GET['post_id'] : 0;
				$meta_key = isset( $_GET['meta_key'] ) ? $_GET['meta_key'] : '';
				if ( $post_id && $meta_key ) {

					// Get the selected posts.
					$selected_posts = get_post_meta( $post_id, $meta_key, false );
					if ( ! empty( $selected_posts ) ) {

						// Mark selected posts.
						if ( ! empty( $selected_posts ) ) {
							foreach ( $posts as $post ) {
								$post->is_selected = in_array( $post->ID, $selected_posts );
							}
						}
					}
				}
			}

			echo json_encode( $posts );

		} else {
			echo json_encode( array() );
		}

		wp_die();
	}

	/**
	 * Print events in JSON for AJAX
	 * with selected parent.
	 *
	 * @since   1.0.0
	 * @access  public
	 * @return  void
	 */
	public function ajax_get_events() {

		// Get the posts.
		$posts = get_posts( array(
			'post_type'         => 'schedule',
			'posts_per_page'    => -1,
			'post_status'       => array( 'publish', 'future', 'draft', 'pending' ),
			'orderby'           => 'title',
			'order'             => 'ASC',
			'suppress_filters'  => true,
		));
		if ( ! empty( $posts ) ) {

			// If we're trying to detect an event's parent...
			$select_parent = isset( $_GET['select_parent'] ) ? $_GET['select_parent'] : 0;
			if ( $select_parent > 0 ) {

				// Get event parent.
				$selected_parent = get_post_field( 'post_parent', $select_parent );

				// Mark selected posts.
				foreach ( $posts as $post ) {
					$post->is_selected = ( $selected_parent == $post->ID );
				}
			}
		}

		echo json_encode( $posts );

		wp_die();
	}

	/**
	 * Add styles and scripts in the admin.
	 *
	 * @access  public
	 * @since   1.0.0
	 * @param   string - $hook_suffix - the ID of the current page
	 * @return  void
	 */
	public function enqueue_styles_scripts( $hook_suffix ) {
		global $post_type, $post_id;

		// Only for the settings page
		if ( $this->settings_page_id == $hook_suffix ) {

			// Enqueue our settings styles
			wp_enqueue_style( 'conf-schedule-settings', trailingslashit( plugin_dir_url( dirname( __FILE__ ) ) . 'assets/css' ) . 'conf-schedule-settings.min.css', array(), null );

			// Need these scripts for the meta boxes to work correctly on our settings page
			wp_enqueue_script( 'post' );
			wp_enqueue_script( 'postbox' );

		}

		// Only for the post pages.
		if ( in_array( $hook_suffix, array( 'post.php', 'post-new.php' ) ) ) {

			// Build the style dependencies for the schedule.
			$admin_style_dep = array();

			// We only need extras for the schedule.
			if ( 'schedule' == $post_type ) {

				// Register the various style dependencies.
				wp_register_style( 'jquery-ui', '//code.jquery.com/ui/1.11.4/themes/smoothness/jquery-ui.css', array(), null );
				wp_register_style( 'timepicker', trailingslashit( plugin_dir_url( dirname( __FILE__ ) ) . 'assets/css' ) . 'timepicker.min.css', array(), null );
				wp_register_style( 'select2', trailingslashit( plugin_dir_url( dirname( __FILE__ ) ) . 'assets/css' ) . 'select2.min.css', array(), null );

				array_push( $admin_style_dep, 'jquery-ui', 'timepicker', 'select2' );

			}

			// Enqueue the post styles.
			wp_enqueue_style( 'conf-schedule-admin-post', trailingslashit( plugin_dir_url( dirname( __FILE__ ) ) . 'assets/css' ) . 'admin-post.min.css', $admin_style_dep, null );

			// Register the various script dependencies.
			wp_register_script( 'select2', trailingslashit( plugin_dir_url( dirname( __FILE__ ) ) . 'assets/js' ) . 'select2.min.js', array( 'jquery' ), null, true );

			// Load assets for the speakers page.
			switch ( $post_type ) {

				case 'schedule':

					// Register the various script dependencies.
					wp_register_script( 'timepicker', trailingslashit( plugin_dir_url( dirname( __FILE__ ) ) . 'assets/js' ) . 'timepicker.min.js', array( 'jquery' ), null, true );

					// Enqueue the post script.
					wp_enqueue_script( 'conf-schedule-admin-schedule', trailingslashit( plugin_dir_url( dirname( __FILE__ ) ) . 'assets/js' ) . 'admin-post-schedule.min.js', array( 'jquery', 'jquery-ui-datepicker', 'timepicker', 'select2' ), null, true );

					// Pass info to the script.
					wp_localize_script( 'conf-schedule-admin-schedule', 'conf_sch', array(
						'post_id' => $post_id,
					));

					break;
			}
		}
	}

	/**
	 * Add our settings page.
	 *
	 * @access  public
	 * @since   1.0.0
	 * @return  void
	 */
	public function add_settings_page() {

		$this->settings_page_id = add_submenu_page(
			'edit.php?post_type=schedule',
			__( 'Conference Schedule Settings', 'conf-schedule' ),
			__( 'Settings', 'conf-schedule' ),
			'edit_posts',
			'conf-schedule-settings',
			array( $this, 'print_settings_page' )
		);
	}

	/**
	 * Print our settings page.
	 *
	 * @access  public
	 * @since   1.0.0
	 * @return  void
	 */
	public function print_settings_page() {

		?>
		<div class="wrap">
			<h1><?php echo esc_html( get_admin_page_title() ); ?></h1>
			<form method="post" action="options.php" novalidate="novalidate">
				<?php

				// Setup fields.
				settings_fields( 'conf_schedule' );

				?>
				<div id="poststuff">
					<div id="post-body" class="metabox-holder columns-2">

						<div id="postbox-container-1" class="postbox-container">
							<div id="side-sortables" class="meta-box-sortables">
								<?php

								// Print side boxes.
								do_meta_boxes( $this->settings_page_id, 'side', array() );

								// Print save button.
								submit_button( __( 'Save Changes', 'conf-schedule' ), 'primary', 'conf_schedule_save_changes_side', false );

								?>
							</div>
						</div>

						<div id="postbox-container-2" class="postbox-container">

							<div id="normal-sortables" class="meta-box-sortables">
								<?php do_meta_boxes( $this->settings_page_id, 'normal', array() ); ?>
							</div>

							<div id="advanced-sortables" class="meta-box-sortables">
								<?php do_meta_boxes( $this->settings_page_id, 'advanced', array() ); ?>
							</div>
							<?php

							// Print save button.
							submit_button( __( 'Save Changes', 'conf-schedule' ), 'primary', 'conf_schedule_save_changes_bottom', false );

							?>
						</div>

					</div>
					<br class="clear" />
				</div>
			</form>
		</div>
		<?php

	}

	/**
	 * Register our settings.
	 *
	 * @access  public
	 * @since   1.0.0
	 * @return  void
	 */
	public function register_settings() {
		register_setting( 'conf_schedule', 'conf_schedule', array( $this, 'update_settings' ) );
	}

	/**
	 * Updates the 'conf_schedule' setting.
	 *
	 * @access  public
	 * @since   1.0.0
	 * @param	array - the settings we're sanitizing
	 * @return	array - the updated settings
	 */
	public function update_settings( $settings ) {
		return $settings;
	}

	/**
	 * Add our settings meta boxes.
	 *
	 * @access  public
	 * @since   1.0.0
	 * @return  void
	 */
	public function add_settings_meta_boxes() {

		// Get the settings.
		$settings = conference_schedule()->get_settings();

		// About this Plugin.
		add_meta_box( 'conf-schedule-about-mb',
			__( 'About this Plugin', 'conf-schedule' ),
			array( $this, 'print_settings_meta_boxes' ),
			$this->settings_page_id,
			'side',
			'core',
			array( 'id' => 'about', 'settings' => $settings )
		);

		// Session Fields.
		add_meta_box( 'conf-schedule-fields-mb',
			__( 'Session Fields', 'conf-schedule' ),
			array( $this, 'print_settings_meta_boxes' ),
			$this->settings_page_id,
			'normal',
			'core',
			array( 'id' => 'fields', 'settings' => $settings )
		);

		// Displaying the Schedule.
		add_meta_box( 'conf-schedule-display-schedule-mb',
			__( 'Displaying The Schedule', 'conf-schedule' ),
			array( $this, 'print_settings_meta_boxes' ),
			$this->settings_page_id,
			'normal',
			'core',
			array( 'id' => 'display-schedule', 'settings' => $settings )
		);

	}

	/**
	 * Print our settings meta boxes.
	 *
	 * @access  public
	 * @since   1.0.0
	 * @param   array - $post - information about the current post, which is empty because there is no current post on a settings page
	 * @param   array - $metabox - information about the metabox
	 * @return  void
	 */
	public function print_settings_meta_boxes( $post, $metabox ) {

		switch ( $metabox['args']['id'] ) {

			/*
			 * About meta box.
			 *
			 * @TODO add link to repo for ratings.
			 */
			case 'about':

				?>
				<p><?php _e( 'Helps you build a simple schedule for your conference website.', 'conf-schedule' ); ?></p>
				<p>
					<strong><a href="<?php echo CONFERENCE_SCHEDULE_PLUGIN_URL; ?>" target="_blank"><?php _e( 'Conference Schedule', 'conf-schedule' ); ?></a></strong><br />
					<strong><?php _e( 'Version', 'conf-schedule' ); ?>:</strong> <?php echo CONFERENCE_SCHEDULE_VERSION; ?><br /><strong><?php _e( 'Author', 'conf-schedule' ); ?>:</strong> <a href="https://wpcampus.org/" target="_blank">WPCampus</a>
				</p>
				<?php

				break;

			// Session fields meta box.
			case 'fields':

				// Get settings.
				$settings = ! empty( $metabox['args']['settings'] ) ? $metabox['args']['settings'] : array();

				// Get field settings.
				$fields = isset( $settings['session_fields'] ) ? $settings['session_fields'] : array();

				// Make sure its an array.
				if ( ! is_array( $fields ) ) {
					$fields = explode( ', ', $fields );
				}

				?>
				<table id="conf-schedule-fields" class="form-table conf-schedule-settings">
					<tbody>
						<tr>
							<td>
								<fieldset>
									<legend><strong><?php _e( 'Which session fields would you like to enable?', 'conf-schedule' ); ?></strong></legend>
									<label for="conf-sch-fields-livestream"><input type="checkbox" name="conf_schedule[session_fields][]" id="conf-sch-fields-livestream" value="livestream"<?php checked( is_array( $fields ) && in_array( 'livestream', $fields ) ); ?> /> <?php _e( 'Livestream', 'conf-schedule' ); ?></label><br />
									<label for="conf-sch-fields-slides"><input type="checkbox" name="conf_schedule[session_fields][]" id="conf-sch-fields-slides" value="slides"<?php checked( is_array( $fields ) && in_array( 'slides', $fields ) ); ?> /> <?php _e( 'Slides', 'conf-schedule' ); ?></label><br />
									<label for="conf-sch-fields-feedback"><input type="checkbox" name="conf_schedule[session_fields][]" id="conf-sch-fields-feedback" value="feedback"<?php checked( is_array( $fields ) && in_array( 'feedback', $fields ) ); ?> /> <?php _e( 'Feedback', 'conf-schedule' ); ?></label><br />
									<label for="conf-sch-fields-follow-up"><input type="checkbox" name="conf_schedule[session_fields][]" id="conf-sch-fields-follow-up" value="follow_up"<?php checked( is_array( $fields ) && in_array( 'follow_up', $fields ) ); ?> /> <?php _e( 'Follow Up', 'conf-schedule' ); ?></label><br />
									<label for="conf-sch-fields-video"><input type="checkbox" name="conf_schedule[session_fields][]" id="conf-sch-fields-video" value="video"<?php checked( is_array( $fields ) && in_array( 'video', $fields ) ); ?> /> <?php _e( 'Video', 'conf-schedule' ); ?></label>
								</fieldset>
							</td>
						</tr>
					</tbody>
				</table>
				<?php

				break;

			// Displaying The Schedule meta box.
			case 'display-schedule':

				// Get the settings.
				$settings = ! empty( $metabox['args']['settings'] ) ? $metabox['args']['settings'] : array();

				// Get display field settings.
				$display_fields = isset( $settings['schedule_display_fields'] ) ? $settings['schedule_display_fields'] : array();

				// Get the existing pages.
				$pages = get_pages();

				?>
				<table id="conf-schedule-display-schedule" class="form-table conf-schedule-settings">
					<tbody>
						<tr>
							<td>
								<strong><?php _e( 'Use the shortcode', 'conf-schedule' ); ?></strong>
								<p class="description"><?php printf( __( 'Place the shortcode %s inside any content to add the schedule to a page.', 'conf-schedule' ), '[print_conference_schedule]' ); ?></p>
							</td>
						</tr>
						<tr>
							<td>
								<label for="conf-schedule-schedule-add-page"><strong><?php _e( 'Add the schedule to a page:', 'conf-schedule' ); ?></strong></label>
								<select name="conf_schedule[schedule_add_page]" id="conf-schedule-schedule-add-page">
									<option value=""><?php _e( 'Do not add to a page', 'conf-schedule' ); ?></option>
									<?php

									foreach ( $pages as $page ) :

										?>
										<option value="<?php echo $page->ID; ?>"<?php selected( ! empty( $settings['schedule_add_page'] ) && $page->ID == $settings['schedule_add_page'] ); ?>><?php echo $page->post_title; ?></option>
										<?php

									endforeach;

									?>
								</select>
								<p class="description"><?php printf( __( 'If defined, will automatically add the schedule to the end of the selected page. Otherwise, you can add the schedule with the %s shortcode.', 'conf-schedule' ), '[print_conference_schedule]' ); ?></p>
							</td>
						</tr>
						<tr>
							<td>
								<fieldset>
									<legend><strong><?php _e( 'Display the following fields on the main schedule:', 'conf-schedule' ); ?></strong></legend>
									<label for="conf-schedule-display-slides"><input type="checkbox" name="conf_schedule[schedule_display_fields][]" id="conf-schedule-display-slides" value="view_slides"<?php checked( is_array( $display_fields ) && in_array( 'view_slides', $display_fields ) ); ?> /> <?php _e( 'View Slides', 'conf-schedule' ); ?></label><br />
									<label for="conf-schedule-display-livestream"><input type="checkbox" name="conf_schedule[schedule_display_fields][]" id="conf-schedule-display-livestream" value="view_livestream"<?php checked( is_array( $display_fields ) && in_array( 'view_livestream', $display_fields ) ); ?> /> <?php _e( 'View Livestream', 'conf-schedule' ); ?></label><br />
									<label for="conf-schedule-display-feedback"><input type="checkbox" name="conf_schedule[schedule_display_fields][]" id="conf-schedule-display-feedback" value="give_feedback"<?php checked( is_array( $display_fields ) && in_array( 'give_feedback', $display_fields ) ); ?> /> <?php _e( 'Give Feedback', 'conf-schedule' ); ?></label><br />
									<label for="conf-schedule-display-video"><input type="checkbox" name="conf_schedule[schedule_display_fields][]" id="conf-schedule-display-video" value="watch_video"<?php checked( is_array( $display_fields ) && in_array( 'watch_video', $display_fields ) ); ?> /> <?php _e( 'Watch Session', 'conf-schedule' ); ?></label>
								</fieldset>
							</td>
						</tr>
						<tr>
							<td>
								<label for="conf-schedule-schedule-pre-html" style="margin-bottom:15px;"><strong><?php _e( 'Content to add before the schedule:', 'conf-schedule' ); ?></strong></label>
								<?php

								// Get the saved pre HTML.
								$pre_html = ! empty( $settings['pre_html'] ) ? $settings['pre_html'] : '';

								// Print the editor.
								wp_editor( $pre_html, 'conf-schedule-schedule-pre-html', array(
									'wpautop'       => true,
									'media_buttons' => true,
									'textarea_name' => 'conf_schedule[pre_html]',
									'editor_height' => '200px',
								));

								?>
							</td>
						</tr>
						<tr>
							<td>
								<label for="conf-schedule-schedule-post-html" style="margin-bottom:15px;"><strong><?php _e( 'Content to add after the schedule:', 'conf-schedule' ); ?></strong></label>
								<?php

								// Get the saved post HTML.
								$post_html = ! empty( $settings['post_html'] ) ? $settings['post_html'] : '';

								// Print the editor.
								wp_editor( $post_html, 'conf-schedule-schedule-post-html', array(
									'wpautop'       => true,
									'media_buttons' => true,
									'textarea_name' => 'conf_schedule[post_html]',
									'editor_height' => '200px',
								));

								?>
							</td>
						</tr>
						<tr>
							<td>
								<label for="conf-schedule-event-pre-html" style="margin-bottom:15px;"><strong><?php _e( 'Content to add before the single event listings:', 'conf-schedule' ); ?></strong></label>
								<?php

								// Get the saved pre HTML.
								$pre_event_html = ! empty( $settings['pre_event_html'] ) ? $settings['pre_event_html'] : '';

								// Print the editor.
								wp_editor( $pre_event_html, 'conf-schedule-event-pre-html', array(
									'wpautop'       => true,
									'media_buttons' => true,
									'textarea_name' => 'conf_schedule[pre_event_html]',
									'editor_height' => '200px',
								));

								?>
							</td>
						</tr>
						<tr>
							<td>
								<label for="conf-schedule-event-post-html" style="margin-bottom:15px;"><strong><?php _e( 'Content to add after the single event listings:', 'conf-schedule' ); ?></strong></label>
								<?php

								// Get the saved post HTML.
								$post_event_html = ! empty( $settings['post_event_html'] ) ? $settings['post_event_html'] : '';

								// Print the editor.
								wp_editor( $post_event_html, 'conf-schedule-event-post-html', array(
									'wpautop'       => true,
									'media_buttons' => true,
									'textarea_name' => 'conf_schedule[post_event_html]',
									'editor_height' => '200px',
								));

								?>
							</td>
						</tr>
					</tbody>
				</table>
				<?php

				break;

		}

	}

	/**
	 * Adds instructions to the admin thumbnail meta box.
	 *
	 * @access  public
	 * @since   1.0.0
	 * @param   $content - string - the default HTML
	 * @param   $post_id - ID - the post ID
	 * @return  string - the filtered HTML
	 */
	public function filter_admin_post_thumbnail_html( $content, $post_id ) {

		// Show instructions for speaker photo.
		if ( 'speakers' == get_post_type( $post_id ) ) {
			$content .= '<div class="wp-ui-highlight" style="padding:10px;margin:15px 0 5px 0;">' . __( "Please load the speaker's photo as a featured image. The image needs to be at least 200px wide.", 'conf-schedule' ) . '</div>';
		}

		return $content;
	}

	/**
	 * Prints any needed admin notices.
	 *
	 * @access  public
	 * @since   1.0.0
	 * @return  void
	 */
	public function print_admin_notice() {
		global $hook_suffix, $post_type;

		// Only need for certain screens.
		if ( ! in_array( $hook_suffix, array( 'edit.php', 'plugins.php' ) ) ) {
			return;
		}

		// Only for the schedule post type.
		if ( 'edit.php' == $hook_suffix && 'schedule' != $post_type ) {
			return;
		}

		// Only for version < 4.7, when API was introduced.
		$version = get_bloginfo( 'version' );
		if ( $version >= 4.7 ) {
			return;
		}

		// Let us know if the REST API plugin, which we depend on, is not active.
		if ( ! is_plugin_active( 'WP-API/plugin.php' ) && ! is_plugin_active( 'rest-api/plugin.php' ) ) :

			?>
			<div class="updated notice">
				<p><?php printf( __( 'The %1$s plugin depends on the %2$s plugin, version 2.0. %3$sPlease activate this plugin%4$s.', 'conf-schedule' ), 'Conference Schedule', 'REST API', '<a href="' . admin_url( 'plugins.php' ) . '">', '</a>' ); ?></p>
			</div>
			<?php

		endif;

	}

	/**
	 * Adds our admin meta boxes.
	 *
	 * @access  public
	 * @since   1.0.0
	 * @param   $post_type - string - the post type
	 * @param   $post - WP_Post - the post object
	 * @return  void
	 */
	public function add_meta_boxes( $post_type, $post ) {

		switch ( $post_type ) {

			case 'schedule':

				// Event Details.
				add_meta_box(
					'conf-schedule-event-details',
					__( 'Event Details', 'conf-schedule' ),
					array( $this, 'print_meta_boxes' ),
					$post_type,
					'normal',
					'high'
				);

				// Get session fields.
				$session_fields = conference_schedule()->get_session_fields();

				// Session Details.
				if ( ! empty( $session_fields ) ) {

					add_meta_box(
						'conf-schedule-session-details',
						__( 'Session Details', 'conf-schedule' ),
						array( $this, 'print_meta_boxes' ),
						$post_type,
						'normal',
						'high'
					);
				}

				// Event Social Media.
				add_meta_box(
					'conf-schedule-social-media',
					__( 'Event Social Media', 'conf-schedule' ),
					array( $this, 'print_meta_boxes' ),
					$post_type,
					'normal',
					'high'
				);

				break;

			case 'speakers':

				// Speaker Events.
				add_meta_box(
					'conf-schedule-speaker-events',
					__( 'Speaker Events', 'conf-schedule' ),
					array( $this, 'print_meta_boxes' ),
					$post_type,
					'normal',
					'high'
				);

				// Speaker Administration.
				add_meta_box(
					'conf-schedule-speaker-admin',
					__( 'Speaker Administration', 'conf-schedule' ),
					array( $this, 'print_meta_boxes' ),
					$post_type,
					'normal',
					'high'
				);

				// Speaker Contact Information.
				add_meta_box(
					'conf-schedule-speaker-contact',
					__( 'Speaker Contact Information', 'conf-schedule' ),
					array( $this, 'print_meta_boxes' ),
					$post_type,
					'normal',
					'high'
				);

				// Speaker Profile.
				add_meta_box(
					'conf-schedule-speaker-profile',
					__( 'Speaker Profile', 'conf-schedule' ),
					array( $this, 'print_meta_boxes' ),
					$post_type,
					'normal',
					'high'
				);

				// Speaker Social Media.
				add_meta_box(
					'conf-schedule-speaker-social-media',
					__( 'Speaker Social Media', 'conf-schedule' ),
					array( $this, 'print_meta_boxes' ),
					$post_type,
					'normal',
					'high'
				);

				break;

			case 'locations':

				// Location Details.
				add_meta_box(
					'conf-schedule-location-details',
					__( 'Location Details', 'conf-schedule' ),
					array( $this, 'print_meta_boxes' ),
					$post_type,
					'normal',
					'high'
				);

				break;

		}

	}

	/**
	 * Removes meta boxes we don't need
	 *
	 * @access  public
	 * @since   1.0.0
	 * @return  void
	 */
	public function remove_meta_boxes() {

		// Remove the event types taxonomy meta box.
		remove_meta_box( 'tagsdiv-event_types', 'schedule', 'side' );

		// Remove the session categories taxonomy meta box.
		remove_meta_box( 'tagsdiv-session_categories', 'schedule', 'side' );

	}

	/**
	 * Prints the content in our admin meta boxes.
	 *
	 * @access  public
	 * @since   1.0.0
	 * @param   $post - WP_Post - the post object
	 * @param   $metabox - array - meta box arguments
	 * @return  void
	 */
	public function print_meta_boxes( $post, $metabox ) {

		switch ( $metabox['id'] ) {

			case 'conf-schedule-event-details':
				$this->print_event_details_form( $post->ID );
				break;

			case 'conf-schedule-session-details':
				$this->print_session_details_form( $post->ID );
				break;

			case 'conf-schedule-social-media':
				$this->print_event_social_media_form( $post->ID );
				break;

			case 'conf-schedule-speaker-events':
				$this->print_speaker_events( $post->ID );
				break;

			case 'conf-schedule-speaker-admin':
				$this->print_speaker_admin_form( $post->ID );
				break;

			case 'conf-schedule-speaker-contact':
				$this->print_speaker_contact_form( $post->ID );
				break;

			case 'conf-schedule-speaker-profile':
				$this->print_speaker_profile_form( $post->ID );
				break;

			case 'conf-schedule-speaker-social-media':
				$this->print_speaker_social_media_form( $post->ID );
				break;

			case 'conf-schedule-location-details':
				$this->print_location_details_form( $post->ID );
				break;

		}

	}

	/**
	 * When the post is saved, saves our custom meta box data.
	 *
	 * @access  public
	 * @since   1.0.0
	 * @param   int - $post_id - the ID of the post being saved
	 * @param   WP_Post - $post - the post object
	 * @param   bool - $update - whether this is an existing post being updated or not
	 * @return  void
	 */
	function save_meta_box_data( $post_id, $post, $update ) {

		// Disregard on autosave.
		if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
			return;
		}

		// Not for auto drafts.
		if ( 'auto-draft' == $post->post_status ) {
			return;
		}

		// Make sure user has permissions.
		$post_type_object = get_post_type_object( $post->post_type );
		$user_has_cap = $post_type_object && isset( $post_type_object->cap->edit_post ) ? current_user_can( $post_type_object->cap->edit_post, $post_id ) : false;

		if ( ! $user_has_cap ) {
			return;
		}

		// Proceed depending on post type.
		switch ( $post->post_type ) {

			case 'schedule':

				// Make sure fields are set.
				if ( isset( $_POST['conf_schedule'] ) && isset( $_POST['conf_schedule']['event'] ) ) {

					// Check if our nonce is set because the 'save_post' action can be triggered at other times.
					if ( isset( $_POST['conf_schedule_save_event_details_nonce'] ) ) {

						// Verify the nonce.
						if ( wp_verify_nonce( $_POST['conf_schedule_save_event_details_nonce'], 'conf_schedule_save_event_details' ) ) {

							// Make sure date is set.
							if ( isset( $_POST['conf_schedule']['event']['date'] ) ) {

								// Sanitize the value.
								$event_date = sanitize_text_field( $_POST['conf_schedule']['event']['date'] );

								// Update/save value.
								update_post_meta( $post_id, 'conf_sch_event_date', $event_date );

							}

							// Make sure times are set.
							foreach ( array( 'start_time', 'end_time' ) as $time_key ) {

								/*
								 * If we have a value, store it.
								 *
								 * Otherwise, clear it out.
								 */
								if ( isset( $_POST['conf_schedule']['event'][ $time_key ] ) ) {

									// Sanitize the value.
									$time_value = sanitize_text_field( $_POST['conf_schedule']['event'][ $time_key ] );

									// If we have a time, format it.
									if ( ! empty( $time_value ) ) {
										$time_value = date( 'H:i', strtotime( $time_value ) );
									}

									// Update/save value.
									update_post_meta( $post_id, "conf_sch_event_{$time_key}", $time_value );

								} else {
									update_post_meta( $post_id, "conf_sch_event_{$time_key}", null );
								}
							}

							/*
							 * Set the event type relationships.
							 */
							if ( isset( $_POST['conf_schedule']['event']['event_types'] ) ) {

								$event_types = $_POST['conf_schedule']['event']['event_types'];

								// Make sure its an array.
								if ( ! is_array( $event_types ) ) {
									$event_types = explode( ',', $event_types );
								}

								// Make sure it has only IDs.
								$event_types = array_filter( $event_types, 'is_numeric' );

								// Convert to integer.
								$event_types = array_map( 'intval', $event_types );

								// Set the terms.
								wp_set_object_terms( $post_id, $event_types, 'event_types', false );

							} else {
								wp_delete_object_term_relationships( $post_id, 'event_types' );
							}

							/*
							 * Make sure session categories are set.
							 */
							if ( isset( $_POST['conf_schedule']['event']['session_categories'] ) ) {

								$session_categories = $_POST['conf_schedule']['event']['session_categories'];

								// Make sure its an array.
								if ( ! is_array( $session_categories ) ) {
									$session_categories = explode( ',', $session_categories );
								}

								// Make sure it has only IDs.
								$session_categories = array_filter( $session_categories, 'is_numeric' );

								// Convert to integer.
								$session_categories = array_map( 'intval', $session_categories );

								// Set the terms.
								wp_set_object_terms( $post_id, $session_categories, 'session_categories', false );

							} else {
								wp_delete_object_term_relationships( $post_id, 'session_categories' );
							}

							// Make sure location is set.
							if ( isset( $_POST['conf_schedule']['event']['location'] ) ) {

								// Sanitize the value.
								$event_location = sanitize_text_field( $_POST['conf_schedule']['event']['location'] );

								// Update/save value.
								update_post_meta( $post_id, 'conf_sch_event_location', $event_location );

							}

							/*
							 * Make sure speakers are set.
							 */
							if ( isset( $_POST['conf_schedule']['event']['speakers'] ) ) {

								// Get new speakers.
								$new_event_speakers = $_POST['conf_schedule']['event']['speakers'];

								// Make sure its an array.
								if ( ! is_array( $new_event_speakers ) ) {
									$new_event_speakers = explode( ',', $new_event_speakers );
								}

								// Make sure it has only IDs.
								$new_event_speakers = array_filter( $new_event_speakers, 'is_numeric' );

								// Convert to integers.
								$new_event_speakers = array_map( 'intval', $new_event_speakers );

								// Get existing speakers.
								$existing_event_speakers = get_post_meta( $post_id, 'conf_sch_event_speaker', false );

								// Go through existing speakers and update.
								foreach ( $existing_event_speakers as $speaker_id ) {

									/*
									 * If the existing speaker is not in
									 * the new speaker set, then delete.
									 *
									 * Otherwise, remove from new set.
									 */
									if ( ! in_array( $speaker_id, $new_event_speakers ) ) {
										delete_post_meta( $post_id, 'conf_sch_event_speaker', $speaker_id );
									} else {
										unset( $new_event_speakers[ array_search( $speaker_id, $new_event_speakers ) ] );
									}
								}

								// Go through and add new speakers.
								if ( ! empty( $new_event_speakers ) ) {
									foreach ( $new_event_speakers as $speaker_id ) {
										add_post_meta( $post_id, 'conf_sch_event_speaker', $speaker_id, false );
									}
								}
							} else {
								delete_post_meta( $post_id, 'conf_sch_event_speaker' );
							}

							/*
							 * Make sure 'sch_link_to_post' is set.
							 */
							if ( isset( $_POST['conf_schedule']['event']['sch_link_to_post'] ) ) {
								update_post_meta( $post_id, 'conf_sch_link_to_post', '1' );
							} else {
								update_post_meta( $post_id, 'conf_sch_link_to_post', '0' );
							}
						}
					}

					/*
					 * Check if our session details nonce is set because
					 * the 'save_post' action can be triggered at other times.
					 */
					if ( isset( $_POST['conf_schedule_save_session_details_nonce'] ) ) {

						// Verify the nonce.
						if ( wp_verify_nonce( $_POST['conf_schedule_save_session_details_nonce'], 'conf_schedule_save_session_details' ) ) {

							// Process each field.
							foreach ( array( 'livestream_disable', 'livestream_url', 'slides_url', 'feedback_url', 'feedback_reveal_delay_seconds', 'follow_up_url', 'video_url' ) as $field_name ) {
								if ( isset( $_POST['conf_schedule']['event'][ $field_name ] ) ) {

									// Sanitize the value.
									$field_value = sanitize_text_field( $_POST['conf_schedule']['event'][ $field_name ] );

									// Update/save value.
									update_post_meta( $post_id, "conf_sch_event_{$field_name}", trim( $field_value ) );

								}
							}

							/*
							 * Process the session file.
							 *
							 * Check to see if our
							 * 'conf_schedule_event_delete_slides_file'
							 * hidden input is included.
							 */
							if ( ! empty( $_FILES ) && isset( $_FILES['conf_schedule_event_slides_file'] ) && ! empty( $_FILES['conf_schedule_event_slides_file']['name'] ) ) {

								// Upload the file to the server.
								$upload_file = wp_handle_upload( $_FILES['conf_schedule_event_slides_file'], array( 'test_form' => false ) );

								// If the upload was successful...
								if ( $upload_file && ! isset( $upload_file['error'] ) ) {

									// Should be the path to a file in the upload directory.
									$file_name = $upload_file['file'];

									// Get the file type.
									$file_type = wp_check_filetype( $file_name );

									// Prepare an array of post data for the attachment.
									$attachment = array( 'guid' => $upload_file['url'], 'post_mime_type' => $file_type['type'], 'post_title' => preg_replace( '/\.[^.]+$/', '', basename( $file_name ) ), 'post_content' => '', 'post_status' => 'inherit' );

									// Insert the attachment.
									if ( $attachment_id = wp_insert_attachment( $attachment, $file_name, $post_id ) ) {

										// Generate the metadata for the attachment and update the database record.
										if ( $attach_data = wp_generate_attachment_metadata( $attachment_id, $file_name ) ) {
											wp_update_attachment_metadata( $attachment_id, $attach_data );
										}

										// Update/save value.
										update_post_meta( $post_id, 'conf_sch_event_slides_file', $attachment_id );

									}
								}
							} elseif ( isset( $_POST['conf_schedule_event_delete_slides_file'] )
								&& $_POST['conf_schedule_event_delete_slides_file'] > 0 ) {

								// Clear out the meta.
								update_post_meta( $post_id, 'conf_sch_event_slides_file', null );

							}
						}
					}

					/*
					 * Check if our event social media nonce is set because
					 * the 'save_post' action can be triggered at other times.
					 */
					if ( isset( $_POST['conf_schedule_save_event_social_media_nonce'] ) ) {

						// Verify the nonce.
						if ( wp_verify_nonce( $_POST['conf_schedule_save_event_social_media_nonce'], 'conf_schedule_save_event_social_media' ) ) {

							// Process each field.
							foreach ( array( 'hashtag' ) as $field_name ) {
								if ( isset( $_POST['conf_schedule']['event'][ $field_name ] ) ) {

									// Sanitize the value.
									$field_value = sanitize_text_field( $_POST['conf_schedule']['event'][ $field_name ] );

									// Remove any possible hashtags.
									$field_value = preg_replace( '/\#/i', '', $field_value );

									// Update/save value.
									update_post_meta( $post_id, "conf_sch_event_{$field_name}", $field_value );

								}
							}
						}
					}
				}

				break;

			case 'speakers':

				// Make sure event fields are set.
				if ( isset( $_POST['conf_schedule'] ) && isset( $_POST['conf_schedule']['speaker'] ) ) {

					/*
					 * Check if our speaker admin nonce is set because the
					 * 'save_post' action can be triggered at other times.
					 */
					if ( isset( $_POST['conf_schedule_save_speaker_admin_nonce'] ) ) {

						// Verify the nonce.
						if ( wp_verify_nonce( $_POST['conf_schedule_save_speaker_admin_nonce'], 'conf_schedule_save_speaker_admin' ) ) {

							// Process each field.
							foreach ( array( 'user_id' ) as $field_name ) {
								if ( isset( $_POST['conf_schedule']['speaker'][ $field_name ] ) ) {

									// Sanitize the value.
									$field_value = sanitize_text_field( $_POST['conf_schedule']['speaker'][ $field_name ] );

									// Update/save value.
									update_post_meta( $post_id, "conf_sch_speaker_{$field_name}", $field_value );

								}
							}
						}
					}

					/*
					 * Check if our speaker contact nonce is set because the
					 * 'save_post' action can be triggered at other times.
					 */
					if ( isset( $_POST['conf_schedule_save_speaker_contact_nonce'] ) ) {

						// Verify the nonce.
						if ( wp_verify_nonce( $_POST['conf_schedule_save_speaker_contact_nonce'], 'conf_schedule_save_speaker_contact' ) ) {

							// Process each field.
							foreach ( array( 'email', 'phone' ) as $field_name ) {
								if ( isset( $_POST['conf_schedule']['speaker'][ $field_name ] ) ) {

									// Sanitize the value.
									$field_value = sanitize_text_field( $_POST['conf_schedule']['speaker'][ $field_name ] );

									// Update/save value.
									update_post_meta( $post_id, "conf_sch_speaker_{$field_name}", $field_value );

								}
							}
						}
					}

					/*
					 * Check if our speaker profile nonce is set because the
					 * 'save_post' action can be triggered at other times.
					 */
					if ( isset( $_POST['conf_schedule_save_speaker_profile_nonce'] ) ) {

						// Verify the nonce.
						if ( wp_verify_nonce( $_POST['conf_schedule_save_speaker_profile_nonce'], 'conf_schedule_save_speaker_profile' ) ) {

							// Process each field.
							foreach ( array( 'position', 'url', 'company', 'company_url' ) as $field_name ) {
								if ( isset( $_POST['conf_schedule']['speaker'][ $field_name ] ) ) {

									// Sanitize the value.
									$field_value = sanitize_text_field( $_POST['conf_schedule']['speaker'][ $field_name ] );

									// Update/save value.
									update_post_meta( $post_id, "conf_sch_speaker_{$field_name}", $field_value );

								}
							}
						}
					}

					/*
					 * Check if our speaker social media nonce is set because
					 * the 'save_post' action can be triggered at other times.
					 */
					if ( isset( $_POST['conf_schedule_save_speaker_social_media_nonce'] ) ) {

						// Verify the nonce.
						if ( wp_verify_nonce( $_POST['conf_schedule_save_speaker_social_media_nonce'], 'conf_schedule_save_speaker_social_media' ) ) {

							// Process each field.
							foreach ( array( 'facebook', 'instagram', 'twitter', 'linkedin' ) as $field_name ) {
								if ( isset( $_POST['conf_schedule']['speaker'][ $field_name ] ) ) {

									// Sanitize the value.
									$field_value = sanitize_text_field( $_POST['conf_schedule']['speaker'][ $field_name ] );

									// Update/save value.
									update_post_meta( $post_id, "conf_sch_speaker_{$field_name}", $field_value );

								}
							}
						}
					}
				}

				break;

			case 'locations':

				// Make sure location fields are set.
				if ( isset( $_POST['conf_schedule'] ) && isset( $_POST['conf_schedule']['location'] ) ) {

					/*
					 * Check if our location details nonce is set because the
					 * 'save_post' action can be triggered at other times.
					 */
					if ( isset( $_POST['conf_schedule_save_location_details_nonce'] ) ) {

						// Verify the nonce.
						if ( wp_verify_nonce( $_POST['conf_schedule_save_location_details_nonce'], 'conf_schedule_save_location_details' ) ) {

							// Process each field.
							foreach ( array( 'address', 'google_maps_url' ) as $field_name ) {

								/*
								 * If we have a value, update the value.
								 *
								 * Otherwise, clear out the value.
								 */
								if ( isset( $_POST['conf_schedule']['location'][ $field_name ] ) ) {

									// Sanitize the value.
									$field_value = sanitize_text_field( $_POST['conf_schedule']['location'][ $field_name ] );

									// Update/save value.
									update_post_meta( $post_id, "conf_sch_location_{$field_name}", $field_value );

								} else {
									update_post_meta( $post_id, "conf_sch_location_{$field_name}", null );
								}
							}

							/*
							 * Make sure 'sch_link_to_post' is set.
							 */
							if ( isset( $_POST['conf_schedule']['location']['sch_link_to_post'] ) ) {
								update_post_meta( $post_id, 'conf_sch_link_to_post', '1' );
							} else {
								update_post_meta( $post_id, 'conf_sch_link_to_post', '0' );
							}
						}
					}
				}

				break;

		}

	}

	/**
	 * Print the event details form for a particular event.
	 *
	 * @access  public
	 * @since   1.0.0
	 * @param   int - $post_id - the ID of the event
	 * @return  void
	 */
	public function print_event_details_form( $post_id ) {
		global $wpdb;

		// Add a nonce field so we can check for it when saving the data.
		wp_nonce_field( 'conf_schedule_save_event_details', 'conf_schedule_save_event_details_nonce' );

		// Get saved event details.
		$event_date = get_post_meta( $post_id, 'conf_sch_event_date', true ); // Y-m-d
		$event_start_time = get_post_meta( $post_id, 'conf_sch_event_start_time', true );
		$event_end_time = get_post_meta( $post_id, 'conf_sch_event_end_time', true );

		/*
		 * See if we need to link to the event post in the schedule.
		 *
		 * The default is true.
		 *
		 * If database row doesn't exist, then set as default.
		 * Otherwise, check value.
		 */
		$sch_link_to_post = true;

		// Check the database.
		$sch_link_to_post_db = $wpdb->get_var( $wpdb->prepare( "SELECT meta_id FROM {$wpdb->postmeta} WHERE post_id = %d AND meta_key = 'conf_sch_link_to_post'", $post_id ) );

		// If row exists, then check the value.
		if ( $sch_link_to_post_db ) {
			$sch_link_to_post = get_post_meta( $post_id, 'conf_sch_link_to_post', true );
		}

		// Convert event date to m/d/Y.
		$event_date_mdy = $event_date ? date( 'm/d/Y', strtotime( $event_date ) ) : null;

		?>
		<table class="form-table conf-schedule-post">
			<tbody>
				<tr>
					<th scope="row"><label for="conf-sch-date"><?php _e( 'Date', 'conf-schedule' ); ?></label></th>
					<td>
						<input type="text" id="conf-sch-date" value="<?php echo esc_attr( $event_date_mdy ); ?>" class="conf-sch-date-field" />
						<input name="conf_schedule[event][date]" type="hidden" id="conf-sch-date-alt" value="<?php echo esc_attr( $event_date ); ?>" />
					</td>
				</tr>
				<tr>
					<th scope="row"><label for="conf-sch-event-parent"><?php _e( 'Group with other events', 'conf-schedule' ); ?></label></th>
					<td>
						<select id="conf-sch-event-parent" name="parent_id" data-default="<?php _e( 'Select the event parent', 'conf-schedule' ); ?>" disabled="disabled">
							<option value=""><?php _e( 'Select the event parent', 'conf-schedule' ); ?></option>
						</select>
						<p class="description">
							<a class="conf-sch-refresh-events" href="#"><?php _e( 'Refresh events', 'conf-schedule' ); ?></a> |
							<a href="<?php echo admin_url( 'edit.php?post_type=schedule' ); ?>" target="_blank"><?php _e( 'Manage events', 'conf-schedule' ); ?></a>
						</p>
						<p class="description"><strong><?php _e( 'Group this event by selecting the event parent.', 'conf-schedule' ); ?></strong><br /><?php _e( 'For example, lightning talks are usually events where multiple sessions equal one block on the schedule. To group events, create a "parent" event and assign them all under the same parent.', 'conf-schedule' ); ?></p>
						<?php

						// See if this event has a parent.
						$event_parent = wp_get_post_parent_id( $post_id );

						/*
						 * Does this event have children or siblings?
						 *
						 * @TODO
						 * - update to use same function as AJAX
						 * - make sure they display in order and show time.
						 */
						$event_children = get_children( array(
							'post_parent' => $event_parent > 0 ? $event_parent : $post_id,
							'post_type'   => 'schedule',
							'numberposts' => -1,
							'post_status' => 'any',
						));

						// Remove the current post.
						if ( ! empty( $event_children ) ) {
							$new_event_children = array();
							foreach ( $event_children as $child ) {

								// Don't show the current event.
								if ( $child->ID != $post_id ) :
									$new_event_children[] = $child;
								endif;
							}
							$event_children = $new_event_children;
						}

						if ( ! empty( $event_children ) ) :

							?>
							<div id="conf-sch-event-children">
								<p class="description"><strong><?php

								if ( $event_parent > 0 ) {
									_e( 'This event has the following sibling events:', 'conf-schedule' );
								} else {
									_e( 'This event is a parent to the following events:', 'conf-schedule' );
								}

								?></strong></p>
								<ul>
									<?php

									foreach ( $event_children as $child ) :

										// Don't show the current event.
										if ( $child->ID == $post_id ) :
											continue;
										endif;

										?>
										<li><a href="<?php echo get_edit_post_link( $child->ID ); ?>"><?php echo $child->post_title; ?></a></li>
										<?php

									endforeach;

									?>
								</ul>
							</div>
							<?php

						endif;

						?>
					</td>
				</tr>
				<tr>
					<th scope="row"><label for="conf-sch-start-time"><?php _e( 'Start Time', 'conf-schedule' ); ?></label></th>
					<td>
						<input name="conf_schedule[event][start_time]" type="text" id="conf-sch-start-time" value="<?php echo esc_attr( $event_start_time ); ?>" class="regular-text conf-sch-time-field" />
					</td>
				</tr>
				<tr>
					<th scope="row"><label for="conf-sch-end-time"><?php _e( 'End Time', 'conf-schedule' ); ?></label></th>
					<td>
						<input name="conf_schedule[event][end_time]" type="text" id="conf-sch-end-time" value="<?php echo esc_attr( $event_end_time ); ?>" class="regular-text conf-sch-time-field" />
					</td>
				</tr>
				<tr>
					<?php

					// The default/blank option label.
					$select_default = __( 'No event types', 'conf-schedule' );

					?>
					<th scope="row"><label for="conf-sch-event-types"><?php _e( 'Event Types', 'conf-schedule' ); ?></label></th>
					<td>
						<select id="conf-sch-event-types" name="conf_schedule[event][event_types][]" data-default="<?php echo $select_default; ?>" multiple="multiple" disabled="disabled">
							<option value=""><?php echo $select_default; ?></option>
						</select>
						<p class="description">
							<a class="conf-sch-refresh-event-types" href="#"><?php _e( 'Refresh event types', 'conf-schedule' ); ?></a> |
							<a href="<?php echo admin_url( 'edit-tags.php?taxonomy=event_types&post_type=schedule' ); ?>" target="_blank"><?php _e( 'Manage event types', 'conf-schedule' ); ?></a>
						</p>
					</td>
				</tr>
				<tr>
					<?php

					// The default/blank option label.
					$select_default = __( 'No session categories', 'conf-schedule' );

					?>
					<th scope="row"><label for="conf-sch-session-categories"><?php _e( 'Session Categories', 'conf-schedule' ); ?></label></th>
					<td>
						<select id="conf-sch-session-categories" name="conf_schedule[event][session_categories][]" data-default="<?php echo $select_default; ?>" multiple="multiple" disabled="disabled">
							<option value=""><?php echo $select_default; ?></option>
						</select>
						<p class="description">
							<a class="conf-sch-refresh-session-categories" href="#"><?php _e( 'Refresh categories', 'conf-schedule' ); ?></a> |
							<a href="<?php echo admin_url( 'edit-tags.php?taxonomy=session_categories&post_type=schedule' ); ?>" target="_blank"><?php _e( 'Manage categories', 'conf-schedule' ); ?></a>
						</p>
					</td>
				</tr>
				<tr>
					<th scope="row"><label for="conf-sch-location"><?php _e( 'Location', 'conf-schedule' ); ?></label></th>
					<td>
						<select id="conf-sch-location" name="conf_schedule[event][location]" data-default="<?php _e( 'No location', 'conf-schedule' ); ?>" disabled="disabled">
							<option value=""><?php _e( 'No location', 'conf-schedule' ); ?></option>
						</select>
						<p class="description">
							<a class="conf-sch-refresh-locations" href="#"><?php _e( 'Refresh locations', 'conf-schedule' ); ?></a> |
							<a href="<?php echo admin_url( 'edit.php?post_type=locations' ); ?>" target="_blank"><?php _e( 'Manage locations', 'conf-schedule' ); ?></a>
						</p>
					</td>
				</tr>
				<tr>
					<?php

					// The default/blank option label.
					$select_default = __( 'No speakers', 'conf-schedule' );

					?>
					<th scope="row"><label for="conf-sch-speakers"><?php _e( 'Speakers', 'conf-schedule' ); ?></label></th>
					<td>
						<select id="conf-sch-speakers" name="conf_schedule[event][speakers][]" data-default="<?php echo $select_default; ?>" multiple="multiple" disabled="disabled">
							<option value=""><?php echo $select_default; ?></option>
						</select>
						<p class="description">
							<a class="conf-sch-refresh-speakers" href="#"><?php _e( 'Refresh speakers', 'conf-schedule' ); ?></a> |
							<a href="<?php echo admin_url( 'edit.php?post_type=speakers' ); ?>" target="_blank"><?php _e( 'Manage speakers', 'conf-schedule' ); ?></a>
						</p>
					</td>
				</tr>
				<tr>
					<th scope="row"><?php _e( 'Include Link to Event Post in Schedule', 'conf-schedule' ); ?></th>
					<td>
						<label for="conf-sch-link-post"><input name="conf_schedule[event][sch_link_to_post]" type="checkbox" id="conf-sch-link-post" value="1"<?php checked( isset( $sch_link_to_post ) && $sch_link_to_post ); ?> /> <?php _e( "If checked, will include a link to the event's post in the schedule.", 'conf-schedule' ); ?></label>
					</td>
				</tr>
			</tbody>
		</table>
		<?php

	}

	/**
	 * Print the session details form for a particular event.
	 *
	 * @access  public
	 * @since   1.0.0
	 * @param   int - $post_id - the ID of the event.
	 * @return  void
	 */
	public function print_session_details_form( $post_id ) {

		// Add a session details nonce field so we can check for it when saving the data.
		wp_nonce_field( 'conf_schedule_save_session_details', 'conf_schedule_save_session_details_nonce' );

		// Get the session fields.
		$session_fields = conference_schedule()->get_session_fields();

		?>
		<table class="form-table conf-schedule-post">
			<tbody>
				<?php

				// Print livestream field(s).
				if ( in_array( 'livestream', $session_fields ) ) :

					// Get field information.
					$livestream_disable = get_post_meta( $post_id, 'conf_sch_event_livestream_disable', true );
					$livestream_url = get_post_meta( $post_id, 'conf_sch_event_livestream_url', true );

					?>
					<tr>
						<th scope="row"><?php _e( 'Disable Livestream', 'conf-schedule' ); ?></th>
						<td>
							<label for="conf-sch-livestream-disable"><input name="conf_schedule[event][livestream_disable]" type="checkbox" id="conf-sch-livestream-disable" value="1"<?php checked( isset( $livestream_disable ) && $livestream_disable ); ?> /> <?php _e( 'If checked, will disable this event from showing a livestream URL.', 'conf-schedule' ); ?></label>
							<p class="description"><?php _e( 'Use for non-session events that do not have a livestream, e.g. social and dining events.', 'conf-schedule' ); ?></p>
						</td>
					</tr>
					<tr>
						<th scope="row"><label for="conf-sch-livestream-url"><?php _e( 'Livestream URL', 'conf-schedule' ); ?></label></th>
						<td>
							<input type="text" id="conf-sch-livestream-url" name="conf_schedule[event][livestream_url]" value="<?php echo esc_attr( $livestream_url ); ?>" />
							<p class="description"><?php _e( 'Please provide the URL for users to view the livestream.', 'conf-schedule' ); ?></p>
						</td>
					</tr>
					<?php

				endif;

				// Print slides field(s).
				if ( in_array( 'slides', $session_fields ) ) :

					// Get field information.
					$slides_url = get_post_meta( $post_id, 'conf_sch_event_slides_url', true );
					$slides_file = get_post_meta( $post_id, 'conf_sch_event_slides_file', true );

					?>
					<tr>
						<th scope="row"><label for="conf-sch-slides-url"><?php _e( 'Slides URL', 'conf-schedule' ); ?></label></th>
						<td>
							<input type="url" id="conf-sch-slides-url" name="conf_schedule[event][slides_url]" value="<?php echo esc_attr( $slides_url ); ?>" />
							<p class="description"><?php _e( "Please provide the URL (or file below) for users to download or view this session's slides.", 'conf-schedule' ); ?> <strong><?php _e( 'If a URL and file are provided, the URL will take priority.', 'conf-schedule' ); ?></strong></p>
						</td>
					</tr>
					<tr>
						<th scope="row"><label for="conf-sch-slides-file-input"><?php _e( 'Slides File', 'conf-schedule' ); ?></label></th>
						<td>
							<?php

							// Should we hide the input?
							$slides_file_hide_input = false;

							// If selected file...
							if ( $slides_file > 0 ) :

								/*
								 * Confirm the file still exists.
								 *
								 * Otherwise clear the meta.
								 */
								if ( $slides_file_post = get_post( $slides_file ) ) :

									// Get URL.
									$attached_slides_url = wp_get_attachment_url( $slides_file );

									// Hide the file input.
									$slides_file_hide_input = true;

									?>
									<div id="conf-sch-slides-file-info" style="margin:0 0 10px 0;">
										<a style="display:block;margin:0 0 10px 0;" href="<?php echo $attached_slides_url; ?>" target="_blank"><?php echo $attached_slides_url; ?></a>
										<span class="button conf-sch-slides-file-remove" style="clear:both;padding-left:5px;"><span class="dashicons dashicons-no" style="line-height:inherit"></span> <?php _e( 'Remove the file', 'conf-schedule' ); ?></span>
									</div>
									<?php

								else :
									update_post_meta( $post_id, 'conf_sch_event_slides_file', null );
								endif;

							endif;

							?>
							<input type="file" accept="application/pdf" id="conf-sch-slides-file-input" style="width:75%;<?php echo $slides_file_hide_input ? 'display:none;' : null; ?>" size="25" name="conf_schedule_event_slides_file" value="" />
							<p class="description"><?php _e( "You may also upload a file if you wish to host the session's slides for users to download or view.", 'conf-schedule' ); ?> <strong><?php printf( __( 'Only %s files are allowed.', 'conf-schedule' ), 'PDF' ); ?></strong></p>
						</td>
					</tr>
					<?php

				endif;

				// Print feedback field(s).
				if ( in_array( 'feedback', $session_fields ) ) :

					// Get field information.
					$feedback_url = get_post_meta( $post_id, 'conf_sch_event_feedback_url', true );
					$feedback_reveal_delay_seconds = get_post_meta( $post_id, 'conf_sch_event_feedback_reveal_delay_seconds', true );

					?>
					<tr>
						<th scope="row"><label for="conf-sch-feedback-url"><?php _e( 'Feedback URL', 'conf-schedule' ); ?></label></th>
						<td>
							<input type="url" id="conf-sch-feedback-url" name="conf_schedule[event][feedback_url]" value="<?php echo esc_attr( $feedback_url ); ?>" />
							<p class="description"><?php _e( 'Please provide the URL you wish to provide to gather session feedback.', 'conf-schedule' ); ?> <strong><?php _e( 'It will display 30 minutes after the session has started, unless you provide a value below.', 'conf-schedule' ); ?></strong></p>
						</td>
					</tr>
					<tr>
						<th scope="row"><label for="conf-sch-feedback-reveal-delay-seconds"><?php _e( 'Feedback Reveal Delay Seconds', 'conf-schedule' ); ?></label></th>
						<td>
							<input type="text" id="conf-sch-feedback-reveal-delay-seconds" name="conf_schedule[event][feedback_reveal_delay_seconds]" value="<?php echo esc_attr( $feedback_reveal_delay_seconds ); ?>" />
							<p class="description"><?php _e( 'Please provide the number of seconds after the start of the session after which the feedback button will be revealed.  1800 is the default (30 minutes).', 'conf-schedule' ); ?></p>
						</td>
					</tr>
					<?php

				endif;

				// Print follow up field(s).
				if ( in_array( 'follow_up', $session_fields ) ) :

					// Get field information.
					$follow_up_url = get_post_meta( $post_id, 'conf_sch_event_follow_up_url', true );

					?>
					<tr>
						<th scope="row"><label for="conf-sch-follow-up-url"><?php _e( 'Follow Up URL', 'conf-schedule' ); ?></label></th>
						<td>
							<input type="url" id="conf-sch-follow-up-url" name="conf_schedule[event][follow_up_url]" value="<?php echo esc_attr( $follow_up_url ); ?>"/>
							<p class="description"><?php _e( 'Please provide the URL you wish to provide for session follow-up materials.', 'conf-schedule' ); ?></p>
						</td>
					</tr>
					<?php

				endif;

				// Print video field(s).
				if ( in_array( 'video', $session_fields ) ) :

					// Get field information.
					$video_url = get_post_meta( $post_id, 'conf_sch_event_video_url', true );

					?>
					<tr>
						<th scope="row"><label for="conf-sch-video-url"><?php _e( 'Video URL', 'conf-schedule' ); ?></label></th>
						<td>
							<input type="url" id="conf-sch-video-url" name="conf_schedule[event][video_url]" value="<?php echo esc_attr( $video_url ); ?>"/>
							<p class="description"><?php _e( 'Please provide the URL you wish to provide for the session recording.', 'conf-schedule' ); ?></p>
						</td>
					</tr>
					<?php

				endif;

				?>
			</tbody>
		</table>
		<?php

	}

	/**
	 * Print the social media form for a particular event.
	 *
	 * @access  public
	 * @since   1.0.0
	 * @param   int - $post_id - the ID of the event.
	 * @return  void
	 */
	public function print_event_social_media_form( $post_id ) {

		// Add a nonce field so we can check for it when saving the data.
		wp_nonce_field( 'conf_schedule_save_event_social_media', 'conf_schedule_save_event_social_media_nonce' );

		// Get saved event hashtag.
		$event_hashtag = get_post_meta( $post_id, 'conf_sch_event_hashtag', true );

		?>
		<table class="form-table conf-schedule-post">
			<tbody>
				<tr>
					<th scope="row"><label for="conf-sch-event-hashtag"><?php _e( 'Hashtag', 'conf-schedule' ); ?></label></th>
					<td>
						<input type="text" id="conf-sch-event-hashtag" name="conf_schedule[event][hashtag]" value="<?php echo esc_attr( $event_hashtag ); ?>" class="regular-text" />
						<p class="description"><?php printf( __( 'Please provide the hashtag you wish attendees to use for this event. If no hashtag is provided, the schedule will display the speaker(s) %s account.', 'conf-schedule' ), 'Twitter' ); ?></p>
					</td>
				</tr>
			</tbody>
		</table>
		<?php

	}

	/**
	 * Print a list of the speaker's events.
	 *
	 * @access  public
	 * @since   1.0.0
	 * @param   int - $post_id - the ID of the speaker.
	 * @return  void
	 */
	public function print_speaker_events( $post_id ) {

		// Get the speaker and its events.
		$speaker = new Conference_Schedule_Speaker( $post_id );
		$events = $speaker->get_events();

		// Print events.
		if ( empty( $events ) ) :

			?>
			<p class="description"><?php _e( 'This speaker is not assigned to any events.', 'conf-schedule' ); ?></p>
			<?php

		else :

			// Will hold post status object(s) to reduce duplicate queries.
			$post_status_objects = array();

			?>
			<ul class="conf-schedule-speaker-events">
				<?php

				foreach ( $events as $event ) :

					// Get event post status object.
					$event_status_object = isset( $post_status_objects[ $event->post_status ] ) ?: get_post_status_object( $event->post_status );
					if ( ! isset( $post_status_objects[ $event->post_status ] ) ) {
						$post_status_objects[ $event->post_status ] = $event_status_object;
					}

					?>
					<li class="<?php echo $event->post_status; ?>"><a href="<?php echo get_edit_post_link( $event->ID ); ?>"><?php echo $event->post_title; ?></a> <span class="post-status">(<?php echo $event_status_object->label; ?>)</span></li>
					<?php

				endforeach;

				?>
			</ul>
			<?php

		endif;
	}

	/**
	 * Print the speaker administration
	 * form for a particular speaker.
	 *
	 * @access  public
	 * @since   1.0.0
	 * @param   int - $post_id - the ID of the speaker.
	 */
	public function print_speaker_admin_form( $post_id ) {

		// Add a nonce field so we can check for it when saving the data.
		wp_nonce_field( 'conf_schedule_save_speaker_admin', 'conf_schedule_save_speaker_admin_nonce' );

		?>
		<p class="description conf-schedule-post-desc"><?php _e( 'This information will only be used for administrative purposes.', 'conf-schedule' ); ?></p>
		<table class="form-table conf-schedule-post">
			<tbody>
				<tr>
					<th scope="row"><label for="conf-sch-users"><?php _e( 'WordPress User', 'conf-schedule' ); ?></label></th>
					<td>
						<?php

						// The default/blank option label.
						$select_default = __( 'Do not assign to a user', 'conf-schedule' );

						?>
						<select name="conf_schedule[speaker][user_id]" id="conf-sch-users" data-default="<?php echo $select_default; ?>" disabled="disabled">
							<option value=""><?php echo $select_default; ?></option>
						</select>
						<p class="description">
							<a class="conf-sch-refresh-users" href="#"><?php _e( 'Refresh users', 'conf-schedule' ); ?></a> |
							<a href="<?php echo admin_url( 'users.php' ); ?>" target="_blank"><?php _e( 'Manage users', 'conf-schedule' ); ?></a>
						</p>
						<p class="description"><?php printf( __( 'Assign this speaker to a %s user.', 'conf-schedule' ), 'WordPress' ); ?></p>
					</td>
				</tr>
			</tbody>
		</table>
		<?php

	}

	/**
	 * Print the speaker contact form for a particular speaker.
	 *
	 * @access  public
	 * @since   1.0.0
	 * @param   int - $post_id - the ID of the speaker.
	 */
	public function print_speaker_contact_form( $post_id ) {

		// Add a nonce field so we can check for it when saving the data.
		wp_nonce_field( 'conf_schedule_save_speaker_contact', 'conf_schedule_save_speaker_contact_nonce' );

		// Get saved speaker contact information.
		$speaker_email = get_post_meta( $post_id, 'conf_sch_speaker_email', true );
		$speaker_phone = get_post_meta( $post_id, 'conf_sch_speaker_phone', true );

		?>
		<p class="description conf-schedule-post-desc"><?php _e( "The speaker's contact information will not be displayed on the front-end of the website. This information will only be used for administrative purposes.", 'conf-schedule' ); ?></p>
		<table class="form-table conf-schedule-post">
			<tbody>
				<tr>
					<th scope="row"><label for="conf-sch-email"><?php _e( 'Email Address', 'conf-schedule' ); ?></label></th>
					<td>
						<input type="email" id="conf-sch-email" name="conf_schedule[speaker][email]" value="<?php echo esc_attr( $speaker_email ); ?>" class="regular-text" />
						<p class="description"><?php _e( 'Please provide an email address that may be used to contact the speaker.', 'conf-schedule' ); ?></p>
					</td>
				</tr>
				<tr>
					<th scope="row"><label for="conf-sch-phone"><?php _e( 'Phone', 'conf-schedule' ); ?></label></th>
					<td>
						<input type="tel" id="conf-sch-phone" name="conf_schedule[speaker][phone]" value="<?php echo esc_attr( $speaker_phone ); ?>" class="regular-text" />
						<p class="description"><?php _e( 'Please provide a phone number that may be used to contact the speaker.', 'conf-schedule' ); ?></p>
					</td>
				</tr>
			</tbody>
		</table>
		<?php

	}

	/**
	 * Print the speaker profile form for a particular speaker.
	 *
	 * @access  public
	 * @since   1.0.0
	 * @param   int - $post_id - the ID of the speaker.
	 * @return  void
	 */
	public function print_speaker_profile_form( $post_id ) {

		// Add a nonce field so we can check for it when saving the data.
		wp_nonce_field( 'conf_schedule_save_speaker_profile', 'conf_schedule_save_speaker_profile_nonce' );

		// Get saved speaker profile information.
		$speaker_url = get_post_meta( $post_id, 'conf_sch_speaker_url', true );
		$speaker_company = get_post_meta( $post_id, 'conf_sch_speaker_company', true );
		$speaker_company_url = get_post_meta( $post_id, 'conf_sch_speaker_company_url', true );
		$speaker_position = get_post_meta( $post_id, 'conf_sch_speaker_position', true );

		?>
		<p class="description conf-schedule-post-desc"><?php _e( "The speaker's profile information will be displayed on the front-end of the website.", 'conf-schedule' ); ?></p>
		<table class="form-table conf-schedule-post">
			<tbody>
				<tr>
					<th scope="row"><label for="conf-sch-url"><?php _e( 'Personal Website', 'conf-schedule' ); ?></label></th>
					<td>
						<input type="text" id="conf-sch-url" name="conf_schedule[speaker][url]" value="<?php echo esc_attr( $speaker_url ); ?>" class="regular-text" />
						<p class="description"><?php _e( "Please provide the URL for the speaker's personal website.", 'conf-schedule' ); ?></p>
					</td>
				</tr>
				<tr>
					<th scope="row"><label for="conf-sch-company"><?php _e( 'Company', 'conf-schedule' ); ?></label></th>
					<td>
						<input type="text" id="conf-sch-company" name="conf_schedule[speaker][company]" value="<?php echo esc_attr( $speaker_company ); ?>" class="regular-text" />
						<p class="description"><?php _e( 'Where does the speaker work?', 'conf-schedule' ); ?></p>
					</td>
				</tr>
				<tr>
					<th scope="row"><label for="conf-sch-company-url"><?php _e( 'Company Website', 'conf-schedule' ); ?></label></th>
					<td>
						<input type="text" id="conf-sch-company-url" name="conf_schedule[speaker][company_url]" value="<?php echo esc_attr( $speaker_company_url ); ?>" class="regular-text" />
						<p class="description"><?php _e( "Please provide the URL for the speaker's company website.", 'conf-schedule' ); ?></p>
					</td>
				</tr>
				<tr>
					<th scope="row"><label for="conf-sch-position"><?php _e( 'Position', 'conf-schedule' ); ?></label></th>
					<td>
						<input type="text" id="conf-sch-position" name="conf_schedule[speaker][position]" value="<?php echo esc_attr( $speaker_position ); ?>" class="regular-text" />
						<p class="description"><?php _e( "Please provide the speaker's job title.", 'conf-schedule' ); ?></p>
					</td>
				</tr>
			</tbody>
		</table>
		<?php

	}

	/**
	 * Print the social media form for a particular speaker.
	 *
	 * @access  public
	 * @since   1.0.0
	 * @param   int - $post_id - the ID of the speaker.
	 * @return  void
	 */
	public function print_speaker_social_media_form( $post_id ) {

		// Add a nonce field so we can check for it when saving the data.
		wp_nonce_field( 'conf_schedule_save_speaker_social_media', 'conf_schedule_save_speaker_social_media_nonce' );

		// Get saved speaker social media information.
		$speaker_facebook = get_post_meta( $post_id, 'conf_sch_speaker_facebook', true );
		$speaker_instagram = get_post_meta( $post_id, 'conf_sch_speaker_instagram', true );
		$speaker_twitter = get_post_meta( $post_id, 'conf_sch_speaker_twitter', true );
		$speaker_linkedin = get_post_meta( $post_id, 'conf_sch_speaker_linkedin', true );

		?>
		<p class="description conf-schedule-post-desc"><?php _e( "The speaker's social media information will be displayed on the front-end of the website.", 'conf-schedule' ); ?></p>
		<table class="form-table conf-schedule-post">
			<tbody>
			<tr>
				<th scope="row"><label for="conf-sch-facebook">Facebook</label></th>
				<td>
					<input type="text" id="conf-sch-facebook" name="conf_schedule[speaker][facebook]" value="<?php echo esc_attr( $speaker_facebook ); ?>" class="regular-text" />
					<p class="description"><?php printf( __( 'Please provide the full %s URL.', 'conf-schedule' ), 'Facebook' ); ?></p>
				</td>
			</tr>
			<tr>
				<th scope="row"><label for="conf-sch-instagram">Instagram</label></th>
				<td>
					<input type="text" id="conf-sch-instagram" name="conf_schedule[speaker][instagram]" value="<?php echo esc_attr( $speaker_instagram ); ?>" class="regular-text" />
					<p class="description"><?php printf( __( 'Please provide the %s handle or username.', 'conf-schedule' ), 'Instagram' ); ?></p>
				</td>
			</tr>
			<tr>
				<th scope="row"><label for="conf-sch-twitter">Twitter</label></th>
				<td>
					<input type="text" id="conf-sch-twitter" name="conf_schedule[speaker][twitter]" value="<?php echo esc_attr( $speaker_twitter ); ?>" class="regular-text" />
					<p class="description"><?php printf( __( 'Please provide the %s handle, without the "@".', 'conf-schedule' ), 'Twitter' ); ?></p>
				</td>
			</tr>
			<tr>
				<th scope="row"><label for="conf-sch-linkedin">LinkedIn</label></th>
				<td>
					<input type="text" id="conf-sch-linkedin" name="conf_schedule[speaker][linkedin]" value="<?php echo esc_attr( $speaker_linkedin ); ?>" class="regular-text" />
					<p class="description"><?php printf( __( 'Please provide the full %s URL.', 'conf-schedule' ), 'LinkedIn' ); ?></p>
				</td>
			</tr>
			</tbody>
		</table>
		<?php

	}

	/**
	 * Print the location details form for a particular location.
	 *
	 * @access  public
	 * @since   1.0.0
	 * @param   int - $post_id - the ID of the location.
	 * @return  void
	 */
	public function print_location_details_form( $post_id ) {
		global $wpdb;

		// Add a nonce field so we can check for it when saving the data.
		wp_nonce_field( 'conf_schedule_save_location_details', 'conf_schedule_save_location_details_nonce' );

		// Get saved location details.
		$location_address = get_post_meta( $post_id, 'conf_sch_location_address', true );
		$location_google_maps_url = get_post_meta( $post_id, 'conf_sch_location_google_maps_url', true );

		/*
		 * See if we need to link to the location post in the schedule.
		 *
		 * The default is true.
		 *
		 * If database row doesn't exist, then set as default.
		 * Otherwise, check value.
		 */
		$sch_link_to_post = true;

		// Check the database.
		$sch_link_to_post_db = $wpdb->get_var( $wpdb->prepare( "SELECT meta_id FROM {$wpdb->postmeta} WHERE post_id = %d AND meta_key = 'conf_sch_link_to_post'", $post_id ) );

		// If row exists, then check the value.
		if ( $sch_link_to_post_db ) {
			$sch_link_to_post = get_post_meta( $post_id, 'conf_sch_link_to_post', true );
		}

		?>
		<table class="form-table conf-schedule-post">
			<tbody>
				<tr>
					<th scope="row"><label for="conf-sch-address"><?php _e( 'Address', 'conf-schedule' ); ?></label></th>
					<td>
						<input type="text" id="conf-sch-address" name="conf_schedule[location][address]" value="<?php echo esc_attr( $location_address ); ?>" class="regular-text" />
						<p class="description"><?php _e( "Please provide the location's address.", 'conf-schedule' ); ?></p>
					</td>
				</tr>
				<tr>
					<th scope="row"><label for="conf-sch-google-maps-url"><?php printf( __( '%s URL', 'conf-schedule' ), 'Google Maps' ); ?></label></th>
					<td>
						<input type="url" id="conf-sch-google-maps-url" name="conf_schedule[location][google_maps_url]" value="<?php echo esc_attr( $location_google_maps_url ); ?>" class="regular-text" />
						<p class="description"><?php printf( __( 'Please provide the %s URL for this location.', 'conf-schedule' ), 'Google Maps' ); ?></p>
					</td>
				</tr>
				<tr>
					<th scope="row"><?php _e( 'Include Link to Location in Schedule', 'conf-schedule' ); ?></th>
					<td>
						<label for="conf-sch-link-post"><input name="conf_schedule[location][sch_link_to_post]" type="checkbox" id="conf-sch-link-post" value="1"<?php checked( isset( $sch_link_to_post ) && $sch_link_to_post ); ?> /> <?php _e( "If checked, will include a link to the location's post in the schedule.", 'conf-schedule' ); ?></label>
					</td>
				</tr>
			</tbody>
		</table>
		<?php

	}

	/**
	 * Setup the edit form for file upload.
	 *
	 * @access  public
	 * @since   1.0.0
	 * @param   WP_Post - $post - the post object.
	 * @return  void
	 */
	public function post_edit_form_tag( $post ) {

		// Only include when editing the schedule.
		if ( 'schedule' == $post->post_type ) {
			echo ' enctype="multipart/form-data"';
		}
	}

	/**
	 * Add custom admin columns.
	 *
	 * @access  public
	 * @since   1.0.0
	 * @param   $columns - array - An array of column names.
	 * @param   $post_type - string - The post type slug.
	 * @return  array - the filtered column names.
	 */
	public function add_posts_columns( $columns, $post_type ) {

		// Only for these post types.
		if ( ! in_array( $post_type, array( 'schedule', 'speakers' ) ) ) {
			return $columns;
		}

		// Columns to add after title.
		$add_columns_after_title = array(
			'schedule' => array(
				'speakers' => __( 'Speakers', 'conf-schedule' ),
				'location' => __( 'Location', 'conf-schedule' ),
			),
			'speakers' => array(
				'events' => __( 'Events', 'conf-schedule' ),
			),
		);

		// Store new columns.
		$new_columns = array();

		foreach ( $columns as $key => $value ) {

			// If speaker, change column value for title.
			if ( 'title' == $key && 'speakers' == $post_type ) {
				$value = __( 'Name', 'conf-schedule' );
			}

			// Add to new columns.
			$new_columns[ $key ] = $value;

			// Add custom columns after title.
			if ( 'title' == $key ) {
				foreach ( $add_columns_after_title[ $post_type ] as $column_key => $column_value ) {
					$new_columns[ "conf-sch-{$column_key}" ] = $column_value;
				}
			}
		}

		return $new_columns;
	}

	/**
	 * Populate our custom admin columns.
	 *
	 * @access  public
	 * @since   1.0.0
	 * @param   $column - string - The name of the column to display.
	 * @param   $post_id - int - The current post ID.
	 * @return  void
	 */
	public function populate_posts_columns( $column, $post_id ) {

		// Add data for our custom date column.
		if ( in_array( $column, array( 'conf-sch-location', 'conf-sch-speakers' ) ) ) {

			// Get event.
			$event = new Conference_Schedule_Event( $post_id );

			// Get event column information.
			if ( 'conf-sch-location' == $column ) {

				// Get event location.
				$event_location = $event->get_location();
				if ( ! empty( $event_location->ID ) ) :
					?><a href="<?php echo get_edit_post_link( $event_location->ID ); ?>"><?php echo $event_location->post_title; ?></a><?php
				endif;
			} elseif ( 'conf-sch-speakers' == $column ) {

				// Get event speakers.
				$speakers = $event->get_speakers();
				if ( $speakers ) {

					// Build string of speakers.
					$speakers_list = array();
					foreach ( $speakers as $speaker ) {
						$speakers_list[] = '<a href="' . get_edit_post_link( $speaker->ID ) . '">' . $speaker->post_title . '</a>';
					}

					// Print speakers list.
					echo implode( '<br>', $speakers_list );

				}
			}
		} elseif ( 'conf-sch-events' == $column ) {

			// Get speaker.
			$speaker = new Conference_Schedule_Speaker( $post_id );

			// Get speaker's events.
			$events = $speaker->get_events();
			if ( $events ) {

				// Build string of events.
				$events_lists = array();
				foreach ( $events as $event ) {
					$events_lists[] = '<a href="' . get_edit_post_link( $event->ID ) . '">' . $event->post_title . '</a>';
				}

				// Print events list.
				echo implode( '<br>', $events_lists );

			}
		}
	}

	/**
	 * Load the choices for the proposal field.
	 */
	public function load_proposal_field_choices( $field ) {

		// Reset choices.
		$field['choices'] = array();

		$http_wpc_access = get_option( 'http_wpc_access' );
		if ( empty( $http_wpc_access ) ) {
			return $field;
		}

		$api_root = get_option( 'wpc_api_root' );
		if ( empty( $api_root ) ) {
			return $field;
		}

		// Build parameters for query.
		$url_params = array( 'per_page' => 100 );

		// Add event ID to limit query.
		$event_id = get_option( 'wpc_proposal_event' );
		if ( ! empty( $event_id ) ) {
			$url_params['event'] = $event_id;
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
			return $field;
		}

		$proposals = wp_remote_retrieve_body( $response );

		if ( empty( $proposals ) ) {
			return $field;
		}

		$proposals = json_decode( $proposals );

		foreach ( $proposals as $proposal ) {
			$field['choices'][ $proposal->id ] = $proposal->title->rendered;
		}

		return $field;
	}
}

/**
 * Returns the instance of our Conference_Schedule_Admin class.
 *
 * Will come in handy when we need to access the
 * class to retrieve data throughout the plugin.
 *
 * @since	1.0.0
 * @access	public
 * @return	Conference_Schedule_Admin
 */
function conference_schedule_admin() {
	return Conference_Schedule_Admin::instance();
}

// Let's get this show on the road.
conference_schedule_admin();
