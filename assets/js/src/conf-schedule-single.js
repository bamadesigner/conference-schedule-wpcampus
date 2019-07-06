(function( $ ) {
	'use strict';

	// When the document is ready...
	$(document).ready(function() {

		// Process all single containers.
		$('.conf-sch-single-container').each(function(){
			$(this).render_conf_schedule_single();
		});
	});

	///// FUNCTIONS /////

	function get_conf_schedule_post(postID) {
		return $.ajax({
			url: conf_sch.wp_api_route + 'schedule/' + postID,
			type: 'GET',
			dataType: 'json',
			async: true,
			cache: true
		});
	}

	function get_conf_schedule_post_questions(postID) {
		return $.ajax({
			url: conf_sch.ajaxurl,
			type: 'GET',
			dataType: 'html',
			async: true,
			cache: true,
			data: {
				action: 'conf_sch_get_questions',
				postID: postID
			}
		});
	}

	function get_conf_schedule_proposals(args) {
		var data = {};
		if (undefined !== args && undefined !== args.post__in){
			data.post__in = args.post__in;
			data.transient = args.post__in;
		}
		data.action = 'conf_sch_get_proposals';
		return $.ajax({
			url: conf_sch.ajaxurl,
			type: 'GET',
			dataType: 'json',
			async: true,
			cache: true,
			data: data
		});
	};

	function get_conf_schedule_proposal(proposalID,postID) {
		return $.ajax({
			url: conf_sch.ajaxurl,
        	type: 'GET',
        	dataType: 'json',
        	async: true,
        	cache: true,
			data: {
				action: 'conf_sch_get_proposal',
				post_id: postID,
				proposal_id: proposalID
			}
		});
	}

	function get_conf_schedule_event_children(postID) {
		return $.ajax({
			url: conf_sch.wp_api_route + 'schedule/?conf_sch_event_children=' + postID,
			type: 'GET',
			async: true,
			cache: true
		});
	}

	function update_conf_schedule_post_proposal(post,proposal) {

		// If no proposal or not confirmed, update information.
		if ( $.isEmptyObject( proposal ) || 'confirmed' != proposal.proposal_status ) {
			post = conf_schedule_reset_schedule_item(post);
		} else {
			post = conf_schedule_update_schedule_item_from_proposal(post,proposal);
		}

		return post;
	}

	// Add error message, invoked by single container.
	$.fn.print_conf_schedule_single_error = function(errorMsg) {
		var $conf_sch_single = $(this),
			$contentArea = $conf_sch_single.find('.conf-sch-single-content');

		if ( undefined === errorMsg || '' == errorMsg ) {
			errorMsg = conf_sch.error_msg;
		}

		// Create error container if doesn't exist.
		var $errorArea = $contentArea.find('.conf-sch-single-error');
		if (!$errorArea.length) {

			// Create the error container.
			$errorArea = $('<div class="conf-sch-single-error">' + errorMsg + '</div>');

			$contentArea.fadeOut( 500, function() {
				$contentArea.hide().prepend($errorArea);
				$conf_sch_single.addClass('error').removeClass('loading loading--initial');
				$contentArea.fadeIn(500);
			});
		} else {

			$contentArea.fadeOut( 500, function() {
				$contentArea.hide();
				$errorArea.html(errorMsg);
				$conf_sch_single.addClass('error').removeClass('loading loading--initial');
				$contentArea.fadeIn(500);
			});
		}
	}

	// Populate the single area templates.
	$.fn.populate_conf_schedule_single = function(post) {
		var $conf_sch_single = $(this);

		// Make sure the post is valid.
		if ( undefined === post || '' == post || ! post.id ) {
			$conf_sch_single.print_conf_schedule_single_error();
			return false;
		}

		// Setup event links.
		post.event_links = conf_sch_get_item_links(post);
		if (null === post.event_links) {
			post.event_links = {}
		}
		post.event_links.schedule = conf_sch.schedule_url;

		// Take care of the main content.
		var content_template = $('#conf-sch-single-content-template').html();
		if (content_template) {

			// Process the template.
			var process_content = Handlebars.compile(content_template);

			// Update the content.
			$conf_sch_single.find('.conf-sch-single-content').html(process_content(post).trim());
		}

		// Take care of the video content.
		var video_template = $('#conf-sch-single-video-template').html();
		if (video_template) {

			// Process the template.
			var process_video = Handlebars.compile(video_template);

			// Update the content.
			$conf_sch_single.find('.conf-sch-single-video').append(process_video(post).trim());
		}

		// Take care of the livestream button.
		var ls_template = $('#conf-sch-single-ls-template').html();
		if (ls_template) {

			// Process the template.
			var process_ls = Handlebars.compile(ls_template);

			// Update the content.
			$conf_sch_single.find('.conf-sch-single-livestream').html(process_ls(post).trim());
		}

		// Take care of the session notifications.
		var notifications_template = $('#conf-sch-single-notifications-template').html();
		if (notifications_template) {

			// Process the template.
			var process_notifications = Handlebars.compile(notifications_template);

			// Update the content.
			$conf_sch_single.find('.conf-sch-single-notifications').html(process_notifications(post).trim());
		}

		// Take care of the speakers.
		var speakers_template = $('#conf-sch-single-speakers-template').html();
		if (speakers_template) {

			// Process the template.
			var process_speakers = Handlebars.compile(speakers_template);

			// Update the content.
			$conf_sch_single.find('.conf-sch-single-speakers').html(process_speakers(post).trim());
		}

		// Take care of the questions.
		/*var $questionsArea = $conf_sch_single.find('.conf-sch-single-questions');
		if ( $questionsArea ) {
			const getSchedulePostQuestions = get_conf_schedule_post_questions(post.id);
			getSchedulePostQuestions.done(function(questions){
				$questionsArea.html(questions);
				$conf_sch_single.removeClass('loading loading--initial');
			});
		} else {
			$conf_sch_single.removeClass('loading loading--initial');
		}*/

		$conf_sch_single.removeClass('loading loading--initial');
	}

	// Render the single area.
	$.fn.render_conf_schedule_single = function() {
		var $conf_sch_single = $(this);

		// Make sure we have an ID.
		var postID = $conf_sch_single.data('post');
		if ( ! ( postID !== undefined && postID > 0 ) ) {
			$conf_sch_single.print_conf_schedule_single_error();
			return false;
		}

		$conf_sch_single.addClass('loading');

		// Get the schedule item.
		const getSchedulePost = get_conf_schedule_post(postID);
		getSchedulePost.done(function(post){

			// Make sure the post is valid.
			if ( undefined === post || '' == post || ! post.id ) {
				$conf_sch_single.print_conf_schedule_single_error();
				return false;
			}

			post.valid_session = false;

			// No need to continue if not a session or group of events.
            if ($.inArray(post.event_type,['group','session']) < 0) {

            	// Populate the page.
				$conf_sch_single.populate_conf_schedule_single(post);
				return false;
            }

            // If a session, no need if no proposal.
            if ('session' == post.event_type && (undefined === post.proposal || ! post.proposal)) {

            	// Populate the page.
				$conf_sch_single.populate_conf_schedule_single(post);
				return false;
            }

			if ('session' == post.event_type) {

				// Get the proposal information.
				const getScheduleProposal = get_conf_schedule_proposal(post.proposal,postID);
				getScheduleProposal.done(function(proposal){

					// Make sure the proposal is valid.
					if ( undefined === proposal || '' == proposal || ! proposal.ID ) {
						$conf_sch_single.print_conf_schedule_single_error();
						return false;
					}

					// Update the post with proposal info.
					post = update_conf_schedule_post_proposal(post,proposal)

					// Populate the page.
					$conf_sch_single.populate_conf_schedule_single(post);

				});
			} else if ( post.event_type == 'group' ) {

				// Get the event children.
				const getEventChildren = get_conf_schedule_event_children(postID);
				getEventChildren.done(function(children){

					if (undefined === children || !children.length) {
						$conf_sch_single.print_conf_schedule_single_error();
                        return false;
					}

					var proposalArgs = {
						post__in: []
					};

					// Get the children proposals IDs.
					$.each(children, function(index,child) {
						if (child.proposal) {
							proposalArgs.post__in.push(child.proposal);
						}
					});

					const getProposals = get_conf_schedule_proposals(proposalArgs);
					getProposals.done(function(the_proposals){

						if (undefined === the_proposals || !the_proposals.length) {
							$conf_sch_single.print_conf_schedule_single_error();
							return false;
						}

						// Store proposals by ID.
						var proposals = {};
						$.each(the_proposals, function(index,proposal) {
							if (proposal.ID) {
								proposals['proposal'+proposal.ID] = proposal;
							}
						});

						// Make sure event group is an array.
						post.event_children = [];

						// Add proposals to children.
						$.each(children, function(index,child) {

							if (!child.proposal) {
								return false;
							}

							var proposal = null;
							if ( ( 'proposal' + child.proposal ) in proposals ) {
								proposal = proposals['proposal' + child.proposal];
							}

							// If no proposal or not confirmed, update information.
							if ( null === proposal || '' == proposal || $.isEmptyObject( proposal ) || 'confirmed' != proposal.proposal_status ) {
								child = conf_schedule_reset_schedule_item(child);
							} else {
								child = conf_schedule_update_schedule_item_from_proposal(child,proposal);
							}

							// Setup event links.
							child.event_links = conf_sch_get_item_links(child);
							if (null === post.event_links) {
								post.event_links = {}
							}

							post.event_children.push(child);

						});

						// Populate the page.
						$conf_sch_single.populate_conf_schedule_single(post);

					});
				});
			}
		});
	}

	Handlebars.registerHelper( 'notifications', function() {
		if ( 'workshop' == this.format_slug ) {
			return new Handlebars.SafeString( '<div class="panel light-royal-blue center"><a href="/tickets/workshops/"><strong>All workshops require registration</strong></a> in order to attend. <em>Workshops include a snack break.</em></div>' );
		} else if ( $.inArray( this.format_slug, ['session','lightning-talk'] ) >= 0 ) {
			if ('' != this.session_livestream_url) {
				return null;
			}
			// @TODO add back
			return null;
			var watchURL = '/watch/';
			// @TODO add back
			/*if (this.event_location && this.event_location.post_name) {
				watchURL += this.event_location.post_name + '/';
			}*/
			return new Handlebars.SafeString( '<div class="panel light-royal-blue center">This session will be live streamed for free. <a href="' + watchURL + '"><strong>Visit the watch page</strong></a> during the time slot to join the session.</div>' );
		}
		return null;
	});

	// Format the title.
	Handlebars.registerHelper( 'event_title', function() {
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

	Handlebars.registerHelper( 'session_video_message', function() {
		var format = this.format_slug,
			videoSoon = new Handlebars.SafeString( '<p><em>This session\'s recording will be available soon.</em></p>' ),
			noVideoYet = new Handlebars.SafeString( '<p><em>This session does not have a video recording (yet).</em></p>' ),
			workshopMessage = new Handlebars.SafeString( '<p><em>Workshops are not recorded.</em></p>' );

		if ( ! this.event_dt_gmt ) {
			if ( 'workshop' == format ) {
				return workshopMessage;
			} else {
				return noVideoYet;
			}
		}

		var now = new Date(),
			eventDate = new Date( this.event_dt_gmt );

		if ( now <= eventDate ) {
			if ( 'workshop' == format ) {
				return workshopMessage;
			} else {
				return noVideoYet;
			}
		}

		if ( 'workshop' == format ) {
			return workshopMessage;
		}

		return videoSoon;
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
})(jQuery);
