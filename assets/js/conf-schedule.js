(function( $ ) {
	'use strict';

	// Will hold the template.
	var $conf_sch_templ = false;

	// Will hold the schedule and container.
	var $conf_schedule = null;
	var $conf_sch_container = null;

	// When the document is ready...
	$(document).ready(function() {

		// Set the schedule and container.
		$conf_schedule = $( '#conference-schedule' );
		$conf_sch_container = $( '#conference-schedule-container' );

		// Get the templates.
		var $conf_sch_templ_content = $( '#conference-schedule-template' ).html();
		if ( $conf_sch_templ_content !== undefined && $conf_sch_templ_content ) {

			// Parse the template.
			$conf_sch_templ = Handlebars.compile( $conf_sch_templ_content );

			// Render the schedule.
			render_conference_schedule();

		}
	});

	///// FUNCTIONS /////

	// Get/update the schedule.
	function render_conference_schedule() {

		// Build the URL.
		var apiURL = conf_sch.wp_api_route + 'schedule';

		// Add date.
		if ( $conf_sch_container.data('date') != '' ) {
			apiURL += '?conf_sch_event_date=' +  $conf_sch_container.data('date');
		}

		var schedule_items = [], proposals = {};

		// Get the schedule information.
		$.ajax({
			url: apiURL,
			type: 'GET',
			dataType: 'json',
			cache: false,
			success: function( the_schedule_items ) {

				// Make sure we have items.
				if ( undefined === the_schedule_items || '' == the_schedule_items ) {
					return false;
				}

				// Store the schedule items.
				schedule_items = the_schedule_items;

				// Get the proposals.
				$.ajax({
					url: conf_sch.ajaxurl,
					type: 'GET',
					dataType: 'json',
					cache: false,
					asynce: false,
					data: {
						action: 'conf_sch_get_proposals'
					},
					success: function( the_proposals ) {

						// Make sure we have proposals.
						if ( undefined === the_proposals || '' == the_proposals ) {
							return false;
						}

						// Process the proposals.
						$.each( the_proposals, function( index, proposal ) {
							if ( proposal.id ) {
								proposals['proposal'+proposal.id] = proposal;
							}
						});
					},
					complete: function() {

						// Make sure we have schedule items.
						if ( ! schedule_items ) {
							return false;
						}

						// Will hold all "children" events.
						var $children_events = [];

						// Get current date/time.
						var current_dt_local = new Date();

						/*
						 * The offset is positive if the local timezone is behind UTC.
						 * We're converting so negative if behind.
						 */
						var utc_timezone_diff = current_dt_local.getTimezoneOffset() / 60;
						if ( utc_timezone_diff > 0 ) {
							utc_timezone_diff = 0 - utc_timezone_diff;
						} else {
							utc_timezone_diff = Math.abs( utc_timezone_diff );
						}

						// Figure out how to convert the event hours to local times.
						var local_hour_diff = utc_timezone_diff - parseInt( conf_sch.tz_offset );

						// Build the HTML.
						var $schedule_html = '';

						// Index by date.
						var $schedule_by_dates = {};

						// Go through each item.
						$.each( schedule_items, function( index, item ) {

							// If this event is a child, don't add (for now).
							if ( item.event_parent > 0 ) {
								$children_events.push( item );
								return true;
							}

							// If we're a session, make sure we have a proposal.
							var proposal = null;
							if ( 'session' == item.event_type ) {

								if ( item.proposal > 0 && ( 'proposal' + item.proposal ) in proposals ) {
									proposal = proposals['proposal' + item.proposal];
								}

								// If no proposal or not confirmed, update information.
								if ( ! proposal || 'confirmed' != proposal.proposal_status ) {

									// Reset the item.
									item.title.rendered = 'TBA';

									item.content = {};
									item.excerpt = {};

									item.proposal = 0;
									item.speakers = [];
									item.subjects = [];

									item.link_to_post = false;

								} else {

									// Update proposal information.
									if ( proposal.title ) {
										item.title = proposal.title;
									}

									item.content = proposal.content || {};
									item.excerpt = proposal.excerpt || {};

									item.speakers = proposal.speakers || [];
									item.subjects = proposal.subjects || [];

								}
							}

							// Make sure we have a date.
							if ( ! ( item.event_date !== undefined && item.event_date ) ) {
								return true;
							}

							// Make sure we have a start time.
							if ( ! ( item.event_start_time !== undefined && item.event_start_time ) ) {
								return true;
							}

							// Build time index.
							var $event_time_index = item.event_start_time;

							// Add end time.
							if ( item.event_end_time ) {
								$event_time_index += ":" + item.event_end_time;
							}

							// Make sure array exists for the day.
							if ( $schedule_by_dates[item.event_date] === undefined ) {
								$schedule_by_dates[item.event_date] = {};
							}

							// Make sure time row exists.
							if ( $schedule_by_dates[item.event_date][$event_time_index] === undefined ) {
								$schedule_by_dates[item.event_date][$event_time_index] = {
									event_date: item.event_date,
									start_time: item.event_start_time,
									end_time: item.event_end_time,
									events: []
								};
							}

							// Add this item by date.
							$schedule_by_dates[item.event_date][$event_time_index]['events'].push( item );

						});

						// Print out the schedule by date.
						$.each( $schedule_by_dates, function( $date, $day_by_time ) {

							// Will hold the day HTML.
							var $schedule_day_html = '';

							// Will hold the event day for display.
							var $day_display = '';
							
							// Will be true if any event is in progress.
							var event_in_progress = false;

							// Sort through events by the time.
							$.each( $day_by_time, function( $time, $time_items ) {

								// Make sure we have events.
								if ( $time_items.events === undefined
									|| typeof $time_items.events != 'object'
									|| $time_items.events.length == 0 ) {
									return true;
								}

								// Will hold the row time for display.
								var $row_time_display = '';

								// Build events HTML.
								var $row_events = [];

								// Add the events.
								$.each( $time_items.events, function( index, item ) {

									// Get the date.
									if ( '' == $day_display && item.event_date_display ) {
										$day_display = item.event_date_display;
									}

									// Set the time display to the default time display.
									if ( '' == $row_time_display && item.event_time_display ) {
										$row_time_display = item.event_time_display;
									}

									// Render the templates.
									$row_events.push( $conf_sch_templ( item ) );

								});

								// If we have events, add a row.
								if ( $row_events.length >= 1 ) {

									// Split up the date and times.
									var row_date_pieces = null !== $time_items.event_date && $time_items.event_date.search( '-' ) > -1 ? $time_items.event_date.split( '-' ) : [];
									var row_start_time_pieces = null !== $time_items.start_time && $time_items.start_time.search( ':' ) > -1 ? $time_items.start_time.split( ':' ) : [];
									var row_end_time_pieces = null !== $time_items.end_time && $time_items.end_time.search( ':' ) > -1 ? $time_items.end_time.split( ':' ) : [];

									// Get the date year, month, and day.
									var row_start_dt_year = parseInt( row_date_pieces[0] );
									var row_start_dt_month = parseInt( row_date_pieces[1] ) - 1;
									var row_start_dt_day = parseInt( row_date_pieces[2] );

									// Set the start hour and minute. Convert the hour to local time.
									var row_start_hour = parseInt( row_start_time_pieces[0] ) + local_hour_diff;
									var row_start_minute = parseInt( row_start_time_pieces[1] );

									// Set the start date/time.
									var row_start_dt = new Date( row_start_dt_year, row_start_dt_month, row_start_dt_day, row_start_hour, row_start_minute );
									
									// Set the start "delay reveal time".
									var row_start_dt_delay = new Date( row_start_dt.valueOf() );
									if ( conf_sch.reveal_delay !== undefined ) {
										row_start_dt_delay.setSeconds( row_start_dt_delay.getSeconds() - parseInt( conf_sch.reveal_delay ) );
									}

									// Set the end date/time.
									var row_end_dt = null;
									if ( row_end_time_pieces.length > 1 ) {

										// Set the end hour and minute. Convert the hour to local time.
										var row_end_hour = parseInt( row_end_time_pieces[0] ) + local_hour_diff;
										var row_end_minute = parseInt( row_end_time_pieces[1] );

										// Set the new end date/time.
										row_end_dt = new Date( row_start_dt_year, row_start_dt_month, row_start_dt_day, row_end_hour, row_end_minute );

									}

									// Assign the class for the schedule row status.
									var schedule_row_status = '';

									// Only need to add status if we have an end date/time.
									if ( null !== row_end_dt ) {
										if ( row_start_dt_delay < current_dt_local && current_dt_local < row_end_dt ) {
											schedule_row_status = 'status-in-progress';
											event_in_progress = true;
										} else if ( current_dt_local >= row_end_dt ) {
											schedule_row_status = 'status-past';
										} else {
											schedule_row_status = 'status-future';
										}
									}

									// Will hold the row HTML - start with the time.
									var $schedule_row_html = '<div class="schedule-row-item time">' + $row_time_display + '</div>';

									// Add the events.
									$schedule_row_html += '<div class="schedule-row-item events">' + $row_events.join( '' ) + '</div>';

									// Wrap the row.
									$schedule_row_html = '<div class="schedule-row ' + schedule_row_status + '">' + $schedule_row_html + '</div>';

									// Add to the day.
									$schedule_day_html += $schedule_row_html;

								}
							});

							// Build the column header row.
							/*var $schedule_header = '<div class="schedule-header-item time">Time</div>';
							$schedule_header += '<div class="schedule-header-item events">';
							$schedule_header += '<div class="schedule-header-event">Auditorium</div>';
							$schedule_header += '<div class="schedule-header-event ">RM A320</div>';
							$schedule_header += '<div class="schedule-header-event">RM B226</div>';
							$schedule_header += '</div>';

							// Add the column header row.
							$schedule_day_html = '<div class="schedule-header-row">' + $schedule_header + '</div>' + $schedule_day_html;*/

							// Wrap the day in the table.
							$schedule_day_html = '<div class="schedule-table">' + $schedule_day_html + '</div>';

							// Prefix the date header.
							$schedule_day_html = '<h2 class="schedule-header">' + $day_display + '</h2>' + $schedule_day_html;

							// Wrap in day.
							var day_class = 'schedule-by-day';
							if ( event_in_progress ) {
								day_class += ' schedule-in-progress';
							}
							$schedule_day_html = '<div class="' + day_class + '">' + $schedule_day_html + '</div>';

							// Add to schedule.
							$schedule_html += $schedule_day_html;

						});

						// Add the html.
						$conf_schedule.html( $schedule_html );

						// Process the children.
						if ( $children_events.length >= 1 ) {
							$.each( $children_events, function( index, item ) {

								// Get the parent.
								var $event_parent = $( '#conf-sch-event-' + item.event_parent );
								if ( $event_parent.length > 0 ) {

									// Make sure the parent knows it's a parent.
									$event_parent.addClass( 'event-parent' );

									// Make sure it has a child div.
									var $event_children = $event_parent.find( '.event-children' );
									if ( $event_children.length == 0 ) {
										$event_children = $( '<div class="event-children"></div>' ).appendTo( $event_parent );
									}

									// Render the templates.
									$event_children.append( $conf_sch_templ( item ) );

								}
							});
						}

						// Build the buttons.
						var $scheduleNavButtonsTop = $('<div class="schedule-nav-buttons nav-top has-highlight"></div>');
						
						// Add the watch button.
						var $watchSession = $( '<a class="schedule-nav-button highlight" href="' + conf_sch.watch_url + '">' + conf_sch.watch_message + '</a>' );
						$scheduleNavButtonsTop.append( $watchSession );
						
						// Add the "jump" button if event in progress.
						var $inProgress = $('#conference-schedule .schedule-row.status-in-progress:first');
						if ( $inProgress.length > 0 ) {
						
							// Create "jump to current session" button.
							var $jumpSession = $('<button class="schedule-nav-button schedule-jump">' + conf_sch.jump_message + '</button>');
							
							// Add to top buttons.
							$scheduleNavButtonsTop.append( $jumpSession );

						}
						
						// Add the speakers button.
						var $viewSpeakers = $( '<a class="schedule-nav-button" href="' + conf_sch.speakers_url + '">' + conf_sch.speakers_message + '</a>' );
						$scheduleNavButtonsTop.append( $viewSpeakers );
						
						// Build bottom buttons
						var $scheduleNavButtonsBottom = $scheduleNavButtonsTop.clone().removeClass( 'nav-top has-highlight' ).addClass( 'nav-bottom' );
						
						// Build "Go to top" button.
						var $goToTop = $('<button class="schedule-nav-button schedule-top">' + conf_sch.top_message + '</button>');
						
						// Add to buttons.
						$scheduleNavButtonsBottom.append( $goToTop );
						
						// Add buttons to beginning of schedule
						$scheduleNavButtonsTop.insertAfter( $('#conference-schedule .schedule-by-day:first .schedule-header') );

						// Add to end of schedule.
						$conf_schedule.append( $scheduleNavButtonsBottom );
						
						$('#conference-schedule .schedule-jump').on( 'click', function(e) {
							e.preventDefault();

							$( 'html, body' ).animate({
								scrollTop: $inProgress.offset().top
							}, 500, function() {
								$inProgress.find('*:tabbable:first').focus();
							});	
						});
						
						$('#conference-schedule .schedule-top').on( 'click', function(e) {
							e.preventDefault();
							
							var $theSchedule = $('#conference-schedule');
							if ( $theSchedule.length > 0 ) {

								$( 'html, body' ).animate({
									scrollTop: $theSchedule.offset().top
								}, 500, function() {
									$theSchedule.find('*:tabbable:first').focus();
								});	
							}
						});

						// Remove loading status and fade schedule in.
						$conf_sch_container.children().fadeOut();
						$conf_sch_container.removeClass( 'loading' );
						$conf_sch_container.children().fadeIn( 1000 );

					}
				});
			}
		});
	}

	// Format the title.
	Handlebars.registerHelper( 'title', function( $options ) {
		var $new_title = this.title.rendered;
		if ( $new_title !== undefined && $new_title ) {
			if ( this.link_to_post && this.link !== undefined && this.link ) {
				$new_title = '<a href="' + this.link + '">' + $new_title + '</a>';
			}
			return new Handlebars.SafeString( '<h3 class="event-title">' + $new_title + '</h3>' );
		}
		return null;
	});

	// Format the excerpt.
	Handlebars.registerHelper( 'excerpt', function( $options ) {
		var $new_excerpt = this.excerpt.rendered;
		if ( $new_excerpt !== undefined && $new_excerpt ) {
			return new Handlebars.SafeString( '<div class="event-desc">' + $new_excerpt + '</div>' );
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

	// Format the event meta links.
	Handlebars.registerHelper( 'event_links', function( $options ) {

		// Build the string.
		var event_links_string = '';

		// Do we have a livestream URL and is it enabled?
		if ( conf_sch.view_livestream !== undefined && conf_sch.view_livestream != '' && this.session_livestream_url !== undefined && this.session_livestream_url ) {
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

		// Do we have a slides URL and is it enabled?
		if ( conf_sch.view_slides !== undefined && conf_sch.view_slides != '' && this.session_slides_url !== undefined && this.session_slides_url ) {
			event_links_string += '<li class="event-link event-slides"><a href="' + this.session_slides_url + '">' + conf_sch.view_slides + '</span></a></li>';
		}

		// Do we have an event hashtag?
		/*if ( this.event_hashtag !== undefined && this.event_hashtag ) {
			event_links_string += '<li class="event-link event-twitter"><a href="https://twitter.com/search?q=%23' + this.event_hashtag + '"><i class="conf-sch-icon conf-sch-icon-twitter"></i> <span class="icon-label">#' + this.event_hashtag + '</span></a></li>';
		}*/

		if ( event_links_string ) {
			return new Handlebars.SafeString( '<ul class="conf-sch-event-buttons">' + event_links_string + '</ul>' );
		}

		return null;
	});
})( jQuery );
