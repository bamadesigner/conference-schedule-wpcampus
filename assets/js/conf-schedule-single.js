(function( $ ) {
	'use strict';

	// Will hold the livestream.
	var $conf_sch_single_ls = null;
    var conf_sch_single_ls_templ = false;

	// Will hold the main content.
	var $conf_sch_single_content = null;
	var conf_sch_single_content_templ = false;

	// Will hold the before and template.
	var $conf_sch_single_meta = null;
	var conf_sch_single_meta_templ = false;

	// Will hold the speakers template.
	var $conf_sch_single_speakers = null;
	var $conf_sch_single_speakers_title = null;
	var $conf_sch_single_speakers_templ = false;

	// When the document is ready...
	$(document).ready(function() {

		// Set the containers.
		$conf_sch_single_ls = $( '#conf-sch-single-livestream' ).hide();
		$conf_sch_single_content = $( '#conf-sch-single-content' );
		$conf_sch_single_meta = $( '#conf-sch-single-meta' );

		// Hide speakers so we can fade in.
		$conf_sch_single_speakers = $( '#conf-sch-single-speakers').hide();
		$conf_sch_single_speakers_title = $( '#conf-sch-single-speakers-title').hide();

		// Take care of the livestream.
		var conf_sch_single_ls_templ_content = $( '#conf-sch-single-ls-template' ).html();
		if ( conf_sch_single_ls_templ_content ) {
			conf_sch_single_ls_templ = Handlebars.compile( conf_sch_single_ls_templ_content );
		}

		// Take care of the main content.
		var conf_sch_single_content_templ_content = $( '#conf-sch-single-content-template' ).html();
		if ( conf_sch_single_content_templ_content ) {
			conf_sch_single_content_templ = Handlebars.compile( conf_sch_single_content_templ_content );
		}

		// Take care of the single meta.
		var conf_sch_single_meta_templ_content = $( '#conf-sch-single-meta-template' ).html();
		if ( conf_sch_single_meta_templ_content ) {
			conf_sch_single_meta_templ = Handlebars.compile( conf_sch_single_meta_templ_content );
		}

		// Take care of the speakers.
		var $conf_sch_single_speakers_templ_content = $( '#conf-sch-single-speakers-template' ).html();
		if ( $conf_sch_single_speakers_templ_content ) {
			$conf_sch_single_speakers_templ = Handlebars.compile( $conf_sch_single_speakers_templ_content );
		}

		render_conf_schedule_single();

	});

	///// FUNCTIONS /////

	// Get/update the content
	function render_conf_schedule_single() {

		// Make sure we have an ID.
		if ( ! ( conf_sch.post_id !== undefined && conf_sch.post_id > 0 ) ) {
			return false;
		}

		var schedule_item = {}, proposal = {};

		// Get the schedule information
		$.ajax({
			url: conf_sch.wp_api_route + 'schedule/' + conf_sch.post_id,
			success: function( the_schedule_item ) {

				// Make sure we have an item.
				if ( undefined === the_schedule_item || '' == the_schedule_item ) {
					return false;
				}

				schedule_item = the_schedule_item;

				// Make sure we have a proposal ID.
				if ( ! schedule_item.proposal ) {
					return false;
				}

				// Get the proposal.
				$.ajax( {
					url: conf_sch.ajaxurl,
					type: 'GET',
					dataType: 'json',
					async: false,
					cache: false,
					data: {
						action: 'conf_sch_get_proposal',
						proposal_id: schedule_item.proposal
					},
					success: function( the_proposal ) {

						// Make sure we have proposal.
						if ( undefined === the_proposal || '' == the_proposal ) {
							return false;
						}

						proposal = the_proposal;

						// If no proposal or not confirmed, update information.
						if ( ! proposal || 'confirmed' != proposal.proposal_status ) {

							// Reset the item.
							schedule_item.title.rendered = 'TBA';

							schedule_item.content = {};
							schedule_item.excerpt = {};

							schedule_item.proposal = 0;
							schedule_item.speakers = [];
							schedule_item.subjects = [];

							schedule_item.link_to_post = false;

						} else {

							// Update proposal information.
							if ( proposal.title ) {
								schedule_item.title = proposal.title;
							}

							schedule_item.content = proposal.content || {};
							schedule_item.excerpt = proposal.excerpt || {};

							schedule_item.speakers = proposal.speakers || [];
							schedule_item.subjects = proposal.subjects || [];

						}
					}
				});
			},
			complete: function() {

				// Make sure we have a schedule item.
				if ( ! schedule_item ) {
					return false;
				}

				// Add the main content.
				var conf_sch_single_content_templ_html = '';
				if ( conf_sch_single_content_templ ) {
					conf_sch_single_content_templ_html = conf_sch_single_content_templ( schedule_item );					
				}
				
				$conf_sch_single_content.fadeOut( 500, function() {
					$conf_sch_single_content.hide().html( conf_sch_single_content_templ_html ).fadeIn( 500 );
				});

				// Build/add the livestream button.
				if ( conf_sch_single_ls_templ ) {
					
					// Process the template.
					var conf_sch_single_ls_templ_html = conf_sch_single_ls_templ( schedule_item ).trim();
					if ( conf_sch_single_ls_templ_html != '' ) {
						$conf_sch_single_ls.html( conf_sch_single_ls_templ_html ).fadeIn( 1000 );	
					}
				}

				// Build/add the html.
				if ( conf_sch_single_meta_templ ) {
					$conf_sch_single_meta.hide().html( conf_sch_single_meta_templ( schedule_item ) ).fadeIn( 1000 );
				}

				// Get the speakers
				if ( schedule_item.speakers !== undefined ) {
					$.each( schedule_item.speakers, function(index, value) {

						// Create speaker.
						var $speaker_dom = $( $conf_sch_single_speakers_templ( value ) );

						// Render/add the speaker and fade in.
						$conf_sch_single_speakers_title.fadeIn( 1000 );
						$conf_sch_single_speakers.append( $speaker_dom ).fadeIn( 1000 );

					});
				}
			}
		});
	}

	// Format the event meta links
	Handlebars.registerHelper( 'event_links', function( $options ) {

		// Build the string
		var event_links_string = '';

		// Do we have a livestream URL?
		if ( conf_sch.view_livestream !== undefined && '' != conf_sch.view_livestream && this.session_livestream_url !== undefined && this.session_livestream_url ) {
			event_links_string += '<li class="event-link event-livestream"><a href="' + this.session_livestream_url + '">' + conf_sch.view_livestream + '</span></a></li>';
		}

		// Do we have a video URL?
		if ( conf_sch.watch_video !== undefined && conf_sch.watch_video != '' && this.session_video_url !== undefined && this.session_video_url ) {
			event_links_string += '<li class="event-link event-video"><a href="' + this.session_video_url + '">' + conf_sch.watch_video + '</span></a></li>';
		}

		// Do we have a feedback URL?
		if ( conf_sch.give_feedback !== undefined && conf_sch.give_feedback != '' && this.session_feedback_url !== undefined && this.session_feedback_url ) {
			event_links_string += '<li class="event-link event-feedback"><a href="' + this.session_feedback_url + '">' + conf_sch.give_feedback + '</span></a></li>';
		}

		// Do we have a slides URL?
		if ( conf_sch.view_slides !== undefined && conf_sch.view_slides != '' && this.session_slides_url !== undefined && this.session_slides_url ) {
			event_links_string += '<li class="event-link event-slides"><a href="' + this.session_slides_url + '">' + conf_sch.view_slides + '</span></a></li>';
		}
		
		// Add link to schedule.
		event_links_string += '<li class="event-link"><a href="' + conf_sch.schedule_url + '">' + conf_sch.view_schedule + '</span></a></li>';

		// Do we have a hashtag?
		/*if ( this.event_hashtag !== undefined && this.event_hashtag ) {
			event_links_string += '<li class="event-link event-twitter"><a href="https://twitter.com/search?q=%23' + this.event_hashtag + '"><i class="conf-sch-icon conf-sch-icon-twitter"></i> <span class="icon-label">#' + this.event_hashtag + '</span></a></li>';
		}*/

		if ( event_links_string ) {
			return new Handlebars.SafeString( '<ul class="conf-sch-event-buttons">' + event_links_string + '</ul>' );
		}

		return null;
	});

	// Format the speaker position
	Handlebars.registerHelper( 'speaker_meta', function( $options ) {
		var speaker_pos_string = '';

		// Get position.
		if ( this.company_position !== undefined && this.company_position ) {
			speaker_pos_string += '<span class="speaker-position">' + this.company_position + '</span>';
		}

		// Get company.
		if ( this.company !== undefined && this.company ) {

			// Add company name
			var company = this.company;

			// Get company URL
			if ( this.company_website !== undefined && this.company_website ) {
				company = '<a href="' + this.company_website + '">' + company + '</a>';
			}

			// If we have a position, add a comma
			if ( speaker_pos_string ) {
				speaker_pos_string += ', ';
			}

			// Add to main string
			speaker_pos_string += '<span class="speaker-company">' + company + '</span>';

		}

		return new Handlebars.SafeString( '<div class="speaker-meta">' + speaker_pos_string + '</div>' );
	});

	// Format the speaker social media
	Handlebars.registerHelper( 'speaker_social', function( $options ) {
		var social_media_string = '';

		if ( this.facebook !== undefined && this.facebook ) {
			social_media_string += '<li class="social-media facebook"><a href="' + this.facebook + '"><i class="conf-sch-icon conf-sch-icon-facebook-square"></i> <span class="icon-label">Facebook</span></a></li>';
		}

		if ( this.twitter !== undefined && this.twitter ) {
			social_media_string += '<li class="social-media twitter"><a href="https://twitter.com/' + this.twitter + '"><i class="conf-sch-icon conf-sch-icon-twitter"></i> <span class="icon-label">@' + this.twitter + '</span></a></li>';
		}

		if ( this.instagram !== undefined && this.instagram ) {
			social_media_string += '<li class="social-media instagram"><a href="https://www.instagram.com/' + this.instagram + '"><i class="conf-sch-icon conf-sch-icon-instagram"></i> <span class="icon-label">Instagram</span></a></li>';
		}

		if ( this.linkedin !== undefined && this.linkedin ) {
			social_media_string += '<li class="social-media linkedin"><a href="' + this.linkedin + '"><i class="conf-sch-icon conf-sch-icon-linkedin-square"></i> <span class="icon-label">LinkedIn</span></a></li>';
		}

		if ( social_media_string ) {
			return new Handlebars.SafeString( '<ul class="conf-sch-event-buttons conf-sch-social-buttons">' + social_media_string + '</ul>' );
		}
		return null;
	});
})( jQuery );
