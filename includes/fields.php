<?php
/**
 * Holds all the functionality needed
 * to register the plugin's ACF fields.
 */

/**
 * Register the plugin's ACF fields.
 */
function conference_schedule_add_fields() {
	if ( function_exists( 'acf_add_local_field_group' ) ) :

		acf_add_local_field_group( array(
			'key' => 'group_5a36f62c3632f',
			'title' => __( 'Event: The Basics', 'conf-schedule' ),
			'fields' => array(
				array(
					'key' => 'field_5a36f647b6c4d',
					'label' => __( 'Event Type', 'conf-schedule' ),
					'name' => 'event_type',
					'type' => 'radio',
					'instructions' => '',
					'required' => 0,
					'conditional_logic' => 0,
					'choices' => array(
						'' => __( 'Basic', 'conf-schedule' ),
						'group' => __( 'Group of events', 'conf-schedule' ),
						'session' => __( 'Session', 'conf-schedule' ),
					),
					'allow_null' => 1,
					'other_choice' => 0,
					'save_other_choice' => 0,
					'default_value' => '',
					'layout' => 'vertical',
					'return_format' => 'value',
				),
				array(
					'key' => 'field_5a36fb1df46a0',
					'label' => __( 'Proposal', 'conf-schedule' ),
					'name' => 'proposal',
					'type' => 'select',
					'instructions' => '',
					'required' => 0,
					'conditional_logic' => array(
						array(
							array(
								'field' => 'field_5a36f647b6c4d',
								'operator' => '==',
								'value' => 'session',
							),
						),
					),
					'choices' => array(),
					'default_value' => array(),
					'allow_null' => 1,
					'multiple' => 0,
					'ui' => 1,
					'ajax' => 1,
					'return_format' => 'value',
					'placeholder' => '',
				),
			),
			'location' => array(
				array(
					array(
						'param' => 'post_type',
						'operator' => '==',
						'value' => 'schedule',
					),
				),
			),
			'menu_order' => 0,
			'position' => 'normal',
			'style' => 'default',
			'label_placement' => 'left',
			'instruction_placement' => 'field',
			'hide_on_screen' => '',
			'active' => 1,
			'description' => '',
		));
		
		acf_add_local_field_group( array(
			'key' => 'group_5a37f62d4632g',
			'title' => __( 'Event: Livestream', 'conf-schedule' ),
			'fields' => array(
                array(
                    'key' => 'field_2c253bc46890b',
                    'label' => __( 'Disable livestream', 'conf-schedule' ),
                    'name' => 'conf_sch_event_livestream_disable',
                    'type' => 'true_false',
                    'instructions' => '',
                    'required' => 0,
                    'conditional_logic' => 0,
                    'message' => __( 'Check if the livestream is disabled for this session.', 'conf-schedule' ),
                    'default_value' => 0,
                    'ui' => 1,
                    'ui_on_text' => '',
                    'ui_off_text' => '',
                ),
			    array(
					'key' => 'field_2b25abc36890b',
					'label' => __( 'Livestream is over', 'conf-schedule' ),
					'name' => 'livestream_over',
					'type' => 'true_false',
					'instructions' => '',
					'required' => 0,
					'conditional_logic' => 0,
					'message' => __( 'Check if the livestream is over.', 'conf-schedule' ),
					'default_value' => 0,
					'ui' => 1,
					'ui_on_text' => '',
					'ui_off_text' => '',
				),
				array(
					'key' => 'field_5b36e657b7c5d',
					'label' => __( 'YouTube Live Watch ID', 'conf-schedule' ),
					'name' => 'yt_live_watch_id',
					'type' => 'text',
					'instructions' => '',
					'required' => 0,
					'conditional_logic' => 0,
					'allow_null' => 1,
					'other_choice' => 0,
					'save_other_choice' => 0,
					'default_value' => '',
					'layout' => 'vertical',
					'return_format' => 'value',
				),
				array(
					'key' => 'field_5c46e552b7c5d',
					'label' => __( 'Live Captioning Embed URL', 'conf-schedule' ),
					'name' => 'live_caption_url',
					'type' => 'url',
					'instructions' => '',
					'required' => 0,
					'conditional_logic' => 0,
					'allow_null' => 1,
					'other_choice' => 0,
					'save_other_choice' => 0,
					'default_value' => '',
					'layout' => 'vertical',
					'return_format' => 'value',
				),
			),
			'location' => array(
				array(
					array(
						'param' => 'post_type',
						'operator' => '==',
						'value' => 'schedule',
					),
				),
			),
			'menu_order' => 1,
			'position' => 'normal',
			'style' => 'default',
			'label_placement' => 'left',
			'instruction_placement' => 'field',
			'hide_on_screen' => '',
			'active' => 1,
			'description' => '',
		));
	endif;
}
add_action( 'plugins_loaded', 'conference_schedule_add_fields' );
