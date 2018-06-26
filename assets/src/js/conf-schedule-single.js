(function( $ ) {
	'use strict';

	// Will hold the livestream.
	var $conf_sch_single_ls = null;
    var conf_sch_single_ls_templ = false;

	// Will hold the main content.
	var $conf_sch_single_content = null;
	var conf_sch_single_content_templ = false;

	// Will hold the video.
	var $conf_sch_single_video = null;
	var conf_sch_single_video_templ = false;

	// Will hold the before and template.
	var $conf_sch_single_notif = null;
	var conf_sch_single_notif_templ = false;

	// Will hold the speakers template.
	var $conf_sch_single_speakers = null;
	var conf_sch_single_speakers_templ = false;

	// When the document is ready...
	$(document).ready(function() {

		// Set the containers.
		$conf_sch_single_ls = $( '#conf-sch-single-livestream' );
		$conf_sch_single_content = $( '#conf-sch-single-content' );
		$conf_sch_single_video = $( '#conf-sch-single-video' );
		$conf_sch_single_notif = $( '#conf-sch-single-notifications' );

		// Hide speakers so we can fade in.
		$conf_sch_single_speakers = $( '#conf-sch-single-speakers' );

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

		// Take care of the video.
		var conf_sch_single_video_templ_content = $( '#conf-sch-single-video-template' ).html();
		if ( conf_sch_single_video_templ_content ) {
			conf_sch_single_video_templ = Handlebars.compile( conf_sch_single_video_templ_content );
		}

		// Take care of the single meta.
		var conf_sch_single_notif_templ_content = $( '#conf-sch-single-notifications-template' ).html();
		if ( conf_sch_single_notif_templ_content ) {
			conf_sch_single_notif_templ = Handlebars.compile( conf_sch_single_notif_templ_content );
		}

		// Take care of the speakers.
		var conf_sch_single_speakers_templ_content = $( '#conf-sch-single-speakers-template' ).html();
		if ( conf_sch_single_speakers_templ_content ) {
			conf_sch_single_speakers_templ = Handlebars.compile( conf_sch_single_speakers_templ_content );
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
				schedule_item.valid_session = false;

				// Get the group events.
				if ( schedule_item.event_type == 'group' ) {

					$.ajax({
						url: conf_sch.wp_api_route + 'schedule/?conf_sch_event_group=' + schedule_item.id,
						async: false,
						success: function( group_events ) {

							// Make sure we have events.
							if ( undefined === group_events || '' == group_events ) {
								return false;
							}

							// Make sure event group is an array.
							 schedule_item.event_group = [];

							$.each( group_events, function(index, event) {

								$.ajax({
									url: conf_sch.ajaxurl,
									type: 'GET',
									dataType: 'json',
									async: false,
									cache: false,
									data: {
										action: 'conf_sch_get_proposal',
										post_id: event.id,
										proposal_id: event.proposal
									},
									success: function( event_proposal ) {

										// If no proposal or not confirmed, update information.
										if ( undefined === event_proposal || '' == event_proposal || $.isEmptyObject( event_proposal ) || 'confirmed' != event_proposal.proposal_status ) {

											// Reset the item.
											event.title = { rendered: 'TBA' };
											event.content = { rendered: '' };
											event.excerpt = { rendered: '' };

											event.proposal = 0;
											event.speakers = [];
											event.subjects = [];
											event.format_slug = '';
											event.format_name = '';

											event.link_to_post = false;

										} else {

											// Update proposal information.
											event.title = { rendered: event_proposal.title || '' }
											event.valid_session = true;

											if ( event_proposal.content.rendered != '' ) {
												event.content = { rendered: ( schedule_item.content.rendered || '' ) + event_proposal.content.rendered };
											}

											event.excerpt = { rendered: event_proposal.excerpt.rendered || '' };

											event.speakers = event_proposal.speakers || [];
											event.subjects = event_proposal.subjects || [];
											event.format_slug = event_proposal.format_slug;
											event.format_name = event_proposal.format_name;

											event.session_video = event_proposal.session_video;
											event.session_video_url = event_proposal.session_video_url;
											event.session_video_embed = event_proposal.session_video_embed;

											event.session_slides_url = event_proposal.session_slides_url;

										}

										schedule_item.event_group.push(event);

									}
								});
							});
						}
					});
				}

				// No point if not a session or we don't have a proposal ID.
				if ( schedule_item.event_type != 'session' || ! schedule_item.proposal ) {
					return false;
				}

				// Get the proposal.
				$.ajax({
					url: conf_sch.ajaxurl,
					type: 'GET',
					dataType: 'json',
					async: false,
					cache: false,
					data: {
						action: 'conf_sch_get_proposal',
						post_id: conf_sch.post_id,
						proposal_id: schedule_item.proposal
					},
					success: function( the_proposal ) {

						// Make sure we have proposal.
						if ( undefined === the_proposal || '' == the_proposal ) {
							return false;
						}

						proposal = the_proposal;

						// If no proposal or not confirmed, update information.
						if ( $.isEmptyObject( proposal ) || 'confirmed' != proposal.proposal_status ) {

							// Reset the item.
							schedule_item.title.rendered = 'TBA';

							schedule_item.content.rendered = '';
							schedule_item.excerpt = '';

							schedule_item.proposal = 0;
							schedule_item.speakers = [];
							schedule_item.subjects = [];
							schedule_item.format_slug = '';
							schedule_item.format_name = '';

							schedule_item.link_to_post = false;

						} else {

							// Update proposal information.
							if ( proposal.title ) {
								schedule_item.title = proposal.title;
							}

							schedule_item.valid_session = true;

							schedule_item.content.rendered += proposal.content.rendered || '';
							schedule_item.excerpt = proposal.excerpt.rendered|| '';

							schedule_item.speakers = proposal.speakers || [];
							schedule_item.subjects = proposal.subjects || [];
							schedule_item.format_slug = proposal.format_slug;
							schedule_item.format_name = proposal.format_name;

							schedule_item.session_video = proposal.session_video;
							schedule_item.session_video_url = proposal.session_video_url;
							schedule_item.session_video_embed = proposal.session_video_embed;

							schedule_item.session_slides_url = proposal.session_slides_url;

						}
					}
				});
			},
			error: function() {
				print_conf_schedule_single_error();
			},
			complete: function() {

				// Make sure we have a schedule item.
				if ( $.isEmptyObject( schedule_item ) ) {
					print_conf_schedule_single_error();
					return false;
				}

				// Add the main content.
				if ( conf_sch_single_content_templ ) {

					// Process the template.
					var conf_sch_single_content_templ_html = conf_sch_single_content_templ( schedule_item ).trim();

					$conf_sch_single_content.fadeOut( 500, function() {
						$conf_sch_single_content.hide().html( conf_sch_single_content_templ_html ).fadeIn( 500 );
					});
				}

				// Print error if we're viewing a session and we don't have proposal info.
				if ( schedule_item.event_type == 'session' && $.isEmptyObject( proposal ) ) {
					print_conf_schedule_single_error();
				}

				// Build/add the video.
				if ( conf_sch_single_video_templ ) {

					// Process the template.
					var conf_sch_single_video_templ_html = conf_sch_single_video_templ( schedule_item ).trim();
					if ( conf_sch_single_video_templ_html != '' ) {
						$conf_sch_single_video.html( conf_sch_single_video_templ_html ).fadeIn( 1000 );
					}
				}

				// Build/add the livestream button.
				if ( conf_sch_single_ls_templ ) {

					// Process the template.
					var conf_sch_single_ls_templ_html = conf_sch_single_ls_templ( schedule_item ).trim();
					if ( conf_sch_single_ls_templ_html != '' ) {
						$conf_sch_single_ls.html( conf_sch_single_ls_templ_html ).fadeIn( 1000 );
					}
				}

				// Build/add the html.
				if ( conf_sch_single_notif_templ ) {
					var conf_sch_single_notif_html = conf_sch_single_notif_templ( schedule_item ).trim();
					if ( conf_sch_single_notif_html != '' ) {
						$conf_sch_single_notif.hide().html( conf_sch_single_notif_html ).fadeIn( 1000 );
					}
				}

				// Get the speakers
				if ( schedule_item.speakers !== undefined ) {

					// Create speakers markup.
					var speakers_html = conf_sch_single_speakers_templ( schedule_item ).trim();

					// Render/add the speakers and fade in.
					if ( speakers_html != '' ) {
						$conf_sch_single_speakers.hide().html( speakers_html ).fadeIn( 1000 );
					}
				}
			}
		});
	}

	// Add error message.
	function print_conf_schedule_single_error() {
		$conf_sch_single_content.fadeOut( 500, function() {
			$conf_sch_single_content.hide().prepend( conf_sch.error_msg ).fadeIn( 500 );
		});
	}

	Handlebars.registerHelper( 'notifications', function() {
		if ( 'workshop' == this.format_slug ) {
			return new Handlebars.SafeString( '<div class="panel light-royal-blue center"><a href="/tickets/"><strong>All workshops require registration</strong></a> in order to attend. <em>Workshops include a snack break.</em></div>' );
		}
		return null;
	});

	// Format the title.
	Handlebars.registerHelper( 'event_title', function( $options ) {
		var $new_title = this.title.rendered;
		if ( $new_title !== undefined && $new_title ) {
			if ( this.link_to_post && this.link !== undefined && this.link ) {
				$new_title = '<a href="' + this.link + '">' + $new_title + '</a>';
			}
			return new Handlebars.SafeString( '<h2 class="event-title">' + $new_title + '</h2>' );
		}
		return null;
	});

	// Format the event meta links
	Handlebars.registerHelper( 'event_content', function() {
		var event_content = '';
		if ( this.content.rendered != '' ) {
			event_content = this.content.rendered;
		}
		if ( event_content != '' ) {
			return new Handlebars.SafeString( event_content );
		}
		if ( this.event_type == 'group' ) {
			return null;
		}
		return new Handlebars.SafeString( '<p><em>There is no information for this session.</em></p>' );
	});

	Handlebars.registerHelper( 'speakers_header', function() {

		if ( this.speakers !== undefined && this.speakers.length > 0 ) {

			var speakers_string = '';

        	if ( this.speakers.length == 1 ) {
        		speakers_string = conf_sch.speakers_single;
        	} else {
        		speakers_string = conf_sch.speakers_plural;
        	}

			return new Handlebars.SafeString( '<h2 id="conf-sch-single-speakers-title">' + speakers_string + '</h2>' );
        }

        return null;
	});

	// Format the event meta links
	Handlebars.registerHelper( 'event_links', function() {

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

	// Format the social links.
	Handlebars.registerHelper( 'social_media', function( $options ) {

		// Build the string.
		var social_string = '';

		// Do we have speaker twitters?
		if ( this.speakers !== undefined && this.speakers && this.speakers.length > 0 ) {
			$.each( this.speakers, function( index, value ) {
				if ( value.twitter !== undefined && value.twitter ) {
					social_string += '<li class="event-link event-twitter"><a href="https://twitter.com/' + value.twitter + '"><i class="conf-sch-icon conf-sch-icon-twitter"></i> <span class="icon-label">@' + value.twitter + '</span></a></li>';
				}
			});
		}

		if ( social_string ) {
			return new Handlebars.SafeString( '<ul class="conf-sch-event-buttons conf-sch-social-buttons">' + social_string + '</ul>' );
		}

		return null;
	});

	// Format the speaker position
	Handlebars.registerHelper( 'speaker_meta', function() {
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
	Handlebars.registerHelper( 'speaker_social', function() {
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
