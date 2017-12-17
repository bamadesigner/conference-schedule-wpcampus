(function( $ ) {
	'use strict';

	// Will hold the livestream
	var $conf_sch_single_ls = null;
    var $conf_sch_single_ls_templ = false;

	// Will hold the before and template
	var $conf_sch_single_meta = null;
	var $conf_sch_single_meta_templ = false;

	// Will hold the speakers template
	var $conf_sch_single_speakers = null;
	var $conf_sch_single_speakers_templ = false;

	// When the document is ready...
	$(document).ready(function() {

		// Set the containers
		$conf_sch_single_ls = $( '#conf-sch-single-livestream' );
		$conf_sch_single_meta = $( '#conf-sch-single-meta' );

		// Hide speakers so we can fade in
		$conf_sch_single_speakers = $( '#conf-sch-single-speakers').hide();

		// Take care of the livestream
		var $conf_sch_single_ls_templ_content = $( '#conf-sch-single-ls-template' ).html();
		if ( $conf_sch_single_ls_templ_content !== undefined && $conf_sch_single_ls_templ_content != '' ) {

			// Parse the template
			$conf_sch_single_ls_templ = Handlebars.compile( $conf_sch_single_ls_templ_content );

		}

		// Take care of the before
		var $conf_sch_single_meta_templ_content = $( '#conf-sch-single-meta-template' ).html();
		if ( $conf_sch_single_meta_templ_content !== undefined && $conf_sch_single_meta_templ_content != '' ) {

			// Parse the template
			$conf_sch_single_meta_templ = Handlebars.compile( $conf_sch_single_meta_templ_content );

		}

		// Take care of the speakers
		var $conf_sch_single_speakers_templ_content = $( '#conf-sch-single-speakers-template' ).html();
		if ( $conf_sch_single_speakers_templ_content !== undefined && $conf_sch_single_speakers_templ_content != '' ) {

			// Parse the template
			$conf_sch_single_speakers_templ = Handlebars.compile( $conf_sch_single_speakers_templ_content );

		}

		// Render the content
		render_conf_schedule_single();

	});

	///// FUNCTIONS /////

	// Get/update the content
	function render_conf_schedule_single() {

		// Make sure we have an ID
		if ( ! ( conf_sch.post_id !== undefined && conf_sch.post_id > 0 ) ) {
			return false;
		}

		// Get the schedule information
		$.ajax({
			url: conf_sch.wp_api_route + 'schedule/' + conf_sch.post_id,
			success: function( $schedule_item ) {

				// Build/add the livestream button
				$conf_sch_single_ls.hide().html( $conf_sch_single_ls_templ( $schedule_item ) ).fadeIn( 1000 );

				// Build/add the html
				$conf_sch_single_meta.hide().html( $conf_sch_single_meta_templ( $schedule_item ) ).fadeIn( 1000 );

				// Get the speakers
				if ( $schedule_item.event_speakers !== undefined ) {
					$.each( $schedule_item.event_speakers, function( $index, $value ) {

						// Get the speaker information
						$.ajax({
							url: conf_sch.wp_api_route + 'speakers/' + $value.ID,
							success: function( $speaker ) {

								// Make sure is valid speaker
								if ( ! ( $speaker.id !== undefined && $speaker.id > 0 ) ) {
									return false;
								}

								// Create speaker
								var $speaker_dom = $( $conf_sch_single_speakers_templ( $speaker ) );

								// Render/add the speaker and fade in
								$conf_sch_single_speakers.append( $speaker_dom ).fadeIn( 1000 );

							}
						});

					});
				}

			}
		});

	}

	// Format the event meta links
	Handlebars.registerHelper( 'event_links', function( $options ) {

		// Build the string
		var $event_links_string = '';

		// Do we have a hashtag?
		if ( this.event_hashtag !== undefined && this.event_hashtag ) {
			$event_links_string += '<li class="event-link event-twitter"><a href="https://twitter.com/search?q=%23' + this.event_hashtag + '"><i class="conf-sch-icon conf-sch-icon-twitter"></i> <span class="icon-label">#' + this.event_hashtag + '</span></a></li>';
		}

		// Do we have a slides URL?
		if ( conf_sch.view_slides !== undefined && conf_sch.view_slides != '' && this.session_slides_url !== null && this.session_slides_url ) {
			$event_links_string += '<li class="event-link event-slides"><a href="' + this.session_slides_url + '">' + conf_sch.view_slides + '</span></a></li>';
		}

		// Do we have a livestream URL?
		if ( conf_sch.view_livestream !== undefined && '' != conf_sch.view_livestream && this.session_livestream_url !== null && this.session_livestream_url ) {
			$event_links_string += '<li class="event-link event-livestream"><a href="' + this.session_livestream_url + '">' + conf_sch.view_livestream + '</span></a></li>';
		}

		// Do we have a feedback URL?
		if ( conf_sch.give_feedback !== undefined && conf_sch.give_feedback != '' && this.session_feedback_url !== null && this.session_feedback_url ) {
			$event_links_string += '<li class="event-link event-feedback"><a href="' + this.session_feedback_url + '">' + conf_sch.give_feedback + '</span></a></li>';
		}

		// Do we have a video URL?
		if ( conf_sch.watch_video !== undefined && conf_sch.watch_video != '' && this.session_video_url !== null && this.session_video_url ) {
			$event_links_string += '<li class="event-link event-video"><a href="' + this.session_video_url + '">' + conf_sch.watch_video + '</span></a></li>';
		}

		if ( $event_links_string ) {
			return new Handlebars.SafeString( '<ul class="conf-sch-event-links">' + $event_links_string + '</ul>' );
		}
		return null;
	});

	// Format the speaker position
	Handlebars.registerHelper( 'speaker_meta', function( $options ) {

		// Build string
		var $speaker_pos_string = '';

		// Get position
		if ( this.speaker_position !== null && this.speaker_position != null ) {
			$speaker_pos_string += '<span class="speaker-position">' + this.speaker_position + '</span>';
		}

		// Get company
		if ( this.speaker_company !== null && this.speaker_company != '' ) {

			// Add company name
			var $speaker_company = this.speaker_company;

			// Get company URL
			if ( this.speaker_company_url !== null && this.speaker_company_url != '' ) {
				$speaker_company = '<a href="' + this.speaker_company_url + '">' + $speaker_company + '</a>';
			}

			// If we have a position, add a comma
			if ( $speaker_pos_string ) {
				$speaker_pos_string += ', ';
			}

			// Add to main string
			$speaker_pos_string += '<span class="speaker-company">' + $speaker_company + '</span>';

			// Add speaker URL
			/*if ( this.speaker_url !== null && this.speaker_url != '' ) {
				$speaker_pos_string += ' <span class="speaker-url"><a href="' + this.speaker_url + '">' + this.speaker_url + '</a></span>';
			}*/

		}

		return new Handlebars.SafeString( '<div class="speaker-meta">' + $speaker_pos_string + '</div>' );
	});

	// Format the speaker social media
	Handlebars.registerHelper( 'speaker_social_media', function( $options ) {

		// Build string
		var $social_media_string = '';

		// Add Facebook
		if ( this.speaker_facebook !== null && this.speaker_facebook ) {
			$social_media_string += '<li class="social-media facebook"><a href="' + this.speaker_facebook + '"><i class="conf-sch-icon conf-sch-icon-facebook-square"></i> <span class="icon-label">Facebook</span></a></li>';
		}

		// Add Twitter
		if ( this.speaker_twitter !== null && this.speaker_twitter ) {
			$social_media_string += '<li class="social-media twitter"><a href="https://twitter.com/' + this.speaker_twitter + '"><i class="conf-sch-icon conf-sch-icon-twitter"></i> <span class="icon-label">@' + this.speaker_twitter + '</span></a></li>';
		}

		// Add Instagram
		if ( this.speaker_instagram !== null && this.speaker_instagram ) {
			$social_media_string += '<li class="social-media instagram"><a href="https://www.instagram.com/' + this.speaker_instagram + '"><i class="conf-sch-icon conf-sch-icon-instagram"></i> <span class="icon-label">Instagram</span></a></li>';
		}

		// Add LinkedIn
		if ( this.speaker_linkedin !== null && this.speaker_linkedin ) {
			$social_media_string += '<li class="social-media linkedin"><a href="' + this.speaker_linkedin + '"><i class="conf-sch-icon conf-sch-icon-linkedin-square"></i> <span class="icon-label">LinkedIn</span></a></li>';
		}

		if ( $social_media_string ) {
			return new Handlebars.SafeString( '<ul class="speaker-social-media">' + $social_media_string + '</ul>' );
		}
		return null;
	});

})( jQuery );