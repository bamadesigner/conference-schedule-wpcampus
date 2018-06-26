(function( $ ) {
	'use strict';

	// When the document is ready...
	$(document).ready(function() {

		if ( ! $('.conference-schedule-container').length ) {
			return false;
		}

		// Process each schedule.
		$('.conference-schedule-container').each(function(){
			$(this).render_conference_schedule();
		});

		// Lets us know if a schedule is in the viewport.
		$(window).on('resize.conf_schedule_active, scroll.conf_schedule_active', function(e) {
			$('.conference-schedule-container').each(function(){
				$(this).conf_schedule_check_active();
		  	});
		});
	});

	///// FUNCTIONS /////

	// Invoked by a schedule container.
	$.fn.render_conference_schedule = function(refresh) {
		var $conf_sch_container = $(this),
			$conf_schedule = $conf_sch_container.find( '.conference-schedule' ),
			conf_sch_templ = null;

		$conf_sch_container.addClass('loading');

		// Get the template.
		var conf_sch_templ_content = $( '#conference-schedule-template' ).html();
		if ( conf_sch_templ_content !== undefined && conf_sch_templ_content ) {
			conf_sch_templ = Handlebars.compile( conf_sch_templ_content );
		}

		// No point if no template.
		if ( ! conf_sch_templ ) {
			return false;
		}

		// Build the URL.
		var apiURL = conf_sch.wp_api_route + 'schedule',
			apiQuery = '';

		// Add date.
		if ( $conf_sch_container.data('date') !== undefined && $conf_sch_container.data('date') != '' ) {
			apiQuery += '?conf_sch_event_date=' +  $conf_sch_container.data('date');
		}

		// Add location.
		if ( $conf_sch_container.data('location') !== undefined && $conf_sch_container.data('location') != '' ) {
			apiQuery += '?conf_sch_event_location=' +  $conf_sch_container.data('location');
		}

		var schedule_items = [], proposals = {};

		// Holds count of how many sessions have speakers.
		var scheduleSpeakersCount = 0;

		// Get the schedule information.
		$.ajax({
			url: apiURL + apiQuery,
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
					async: false,
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
							if ( proposal.ID ) {
								proposals['proposal'+proposal.ID] = proposal;
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

						// Build the new schedule.
						var $newSchedule = $('<div class="conference-schedule"></div>');

						// Index by date.
						var scheduleByDates = {};

						// Go through each item.
						$.each( schedule_items, function( index, item ) {

							// If we're a session, make sure we have a proposal.
							var proposal = null;
							if ( 'session' == item.event_type ) {

								if ( item.proposal > 0 && ( 'proposal' + item.proposal ) in proposals ) {
									proposal = proposals['proposal' + item.proposal];
								}

								// If no proposal or not confirmed, update information.
								if ( ! proposal || 'confirmed' != proposal.proposal_status ) {

									// Reset the item.
									item.title = {
										rendered: 'TBA'
                                    };

									item.content = {};
									item.excerpt = {};

									item.proposal = 0;
									item.speakers = [];
									item.subjects = [];
									item.format_slug = '';
									item.format_name = '';

									item.link_to_post = false;

								} else {

									// Update proposal information.
									if ( proposal.title ) {
										item.title.rendered = proposal.title;
									}

									item.content = proposal.content || {};
									item.excerpt = proposal.excerpt || {};

									item.speakers = proposal.speakers || [];
									item.subjects = proposal.subjects || [];
									item.format_slug = proposal.format_slug;
									item.format_name = proposal.format_name;

									item.session_video_url = proposal.session_video_url;
									item.session_slides_url = proposal.session_slides_url;

									// Lets us know we have speakers.
									if (item.speakers.length) {
										scheduleSpeakersCount += item.speakers.length;
									}
								}
							}

							// If this event is a child, don't add (for now).
							if ( item.parent > 0 ) {
								$children_events.push( item );
								return true;
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
							if ( scheduleByDates[item.event_date] === undefined ) {
								scheduleByDates[item.event_date] = {};
							}

							// Make sure time row exists.
							if ( scheduleByDates[item.event_date][$event_time_index] === undefined ) {
								scheduleByDates[item.event_date][$event_time_index] = {
									event_date: item.event_date,
									start_time: item.event_start_time,
									end_time: item.event_end_time,
									events: []
								};
							}

							// Add this item by date.
							scheduleByDates[item.event_date][$event_time_index].events.push( item );

						});

						// Print out the schedule by date.
						$.each( scheduleByDates, function( date, dayByTime ) {

							// Will hold the event day/date for display.
							var dayDisplay = '', dateDisplay = '';

							// Will be true if any event is in progress.
							var event_in_progress = false;

							var $newScheduleTable = $('<div class="schedule-table"></div>');

							// Sort through events by the time.
							$.each( dayByTime, function( time, timeItems ) {

								// Make sure we have events.
								if ( timeItems.events === undefined || typeof timeItems.events != 'object' || timeItems.events.length == 0 ) {
									return true;
								}

								// Will hold the row time for display.
								var $row_time_display = '';

								// Build events HTML.
								var rowEvents = [];

								// Add the events.
								$.each( timeItems.events, function( index, item ) {

									// Get the day/date.
									if ( '' == dayDisplay && item.event_day ) {
										dayDisplay = item.event_day;
									}
									if ( '' == dateDisplay && item.event_date_display ) {
										dateDisplay = item.event_date_display;
									}

									// Set the time display to the default time display.
									if ( '' == $row_time_display && item.event_time_display ) {
										$row_time_display = item.event_time_display;
									}

									var $scheduleEvent = $( conf_sch_templ( item ) );

									// Render the templates.
									rowEvents.push( $scheduleEvent );

								});

								// If we have events, add a row.
								if ( rowEvents.length >= 1 ) {

									// Split up the date and times.
									var row_date_pieces = null !== timeItems.event_date && timeItems.event_date.search( '-' ) > -1 ? timeItems.event_date.split( '-' ) : [];
									var row_start_time_pieces = null !== timeItems.start_time && timeItems.start_time.search( ':' ) > -1 ? timeItems.start_time.split( ':' ) : [];
									var row_end_time_pieces = null !== timeItems.end_time && timeItems.end_time.search( ':' ) > -1 ? timeItems.end_time.split( ':' ) : [];

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

									// Create the row.
									var $scheduleRow = $( '<div class="schedule-row ' + schedule_row_status + '"></div>' );

									// Start with the time.
									$scheduleRow.append( '<div class="schedule-row-item time">' + $row_time_display + '</div>' );

									// Add the events.
									var $scheduleRowEvents = $('<div class="schedule-row-item events"></div>');
									$.each( rowEvents, function( index, $value ) {

										// If more than 1 event, let us know how many links for each event.
										if ( rowEvents.length > 1 ) {
											var eventLinksCount = $value.find('.event-links .event-link').length;
											if (eventLinksCount > 0) {
												$value.addClass('has-event-links has-event-links-' + eventLinksCount);
											}
										}

										$scheduleRowEvents.append( $value );
									});

									// Add events to the row.
									$scheduleRow.append( $scheduleRowEvents );

									// Add to the table.
									$newScheduleTable.append($scheduleRow);

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

							// Wrap by the day.
							var $newScheduleDay = $('<div class="schedule-by-day"></div>');

							// Add the date header.
							$newScheduleDay.append($('<h2 class="schedule-header">' + dateDisplay + '</h2>'));

							// Add the table.
							$newScheduleDay.append($newScheduleTable);

							if ( event_in_progress ) {
								$newScheduleDay.addClass('schedule-in-progress');
                            }

                            // See if all events are in the past.
							var pastEventsCount = $newScheduleTable.find('.schedule-row.status-past').length;
							if (pastEventsCount > 0) {

								$newScheduleDay.addClass('schedule-in-past');

								// Add toggle button.
								var $showButton = get_conf_schedule_toggle_button(dayDisplay);
								$showButton.insertBefore($newScheduleTable);
							}

							// Add to the table.
							$newSchedule.append($newScheduleDay);

						});

						// Process the children.
						if ( $children_events.length >= 1 ) {

							// See if times and locations match.
							var children_events_time = null,
								children_events_time_count = 0,
								children_events_location = null,
								children_events_location_count = 0;

							$.each( $children_events, function( index, item ) {

								if (item.event_time_display != '') {
									if (children_events_time === null) {
										children_events_time = item.event_time_display;
										children_events_time_count++;
									} else if (children_events_time === item.event_time_display) {
										children_events_time_count++;
									}
								}

								if (item.event_location.ID){
									if (children_events_location === null) {
										children_events_location = item.event_location.ID;
										children_events_location_count++;
									} else if (children_events_location === item.event_location.ID) {
										children_events_location_count++;
									}
								}

								// Get the parent.
								var $event_parent = $newSchedule.find( '#conf-sch-event-' + item.parent );
								if ( $event_parent.length > 0 ) {

									// Make sure the parent knows it's a parent.
									$event_parent.addClass( 'event-parent' );

									// Make sure it has a child div.
									var $event_children = $event_parent.find( '.event-children' );
									if ( $event_children.length == 0 ) {
										$event_children = $( '<div class="event-children"></div>' ).appendTo( $event_parent );
									}

									if (children_events_time_count === $children_events.length) {
										$event_children.addClass('has-same-time');
                                    }

                                    if (children_events_location_count === $children_events.length) {
										$event_children.addClass('has-same-location');
									}

									// Render the templates.
									$event_children.append( conf_sch_templ( item ) );

								}
							});
						}

						// Replace the schedule.
						$conf_schedule.replaceWith( $newSchedule );

						// Store data.
						$conf_sch_container.data('speakersCount', scheduleSpeakersCount);

						// Add buttons.
						$conf_sch_container.conf_schedule_add_buttons();

						// Setup actions.
						$conf_sch_container.conf_schedule_add_actions();

						// Check if container is "active".
						$conf_sch_container.conf_schedule_check_active();

						// Remove load events.
						$( window ).off( 'resize.conf_schedule_load, scroll.conf_schedule_load' );

						// Remove loading status and fade schedule in.
						$conf_sch_container.removeClass( 'loading' );

						// Reset loading.
						$conf_sch_container.find('.conference-schedule-loading').removeAttr('style');

						// Update the schedule every 10 minutes.
						var refreshSchedule = setTimeout(function(){
							clearTimeout(refreshSchedule);
							$conf_sch_container.refresh_conf_sch_container();
						}, 600000);

					}
				});
			}
		});
	};

	function get_conf_schedule_toggle_button(dayDisplay) {
		var showLabel = 'Show ' + dayDisplay + "'" + 's past events',
			hideLabel = 'Hide ' + dayDisplay + "'" + 's past events';
		return $('<button class="schedule-show-toggle" data-show="' + showLabel + '" data-hide="' + hideLabel + '">' + showLabel + '</button>');
	}

	// Invoked by a schedule container.
	$.fn.conf_schedule_add_actions = function() {
    	var $conf_sch_container = $(this);

    	$conf_sch_container.find('.schedule-show-toggle').on('click',function(e){
    		var $scheduleToggle = $(this),
    		 	$scheduleByDay = $scheduleToggle.closest('.schedule-by-day');
    		if ( $scheduleByDay.hasClass('schedule-show') ) {
    			$scheduleByDay.removeClass('schedule-show');
    			$scheduleToggle.text($scheduleToggle.data('show'));
    		} else {
    			$scheduleByDay.addClass('schedule-show');
    			$scheduleToggle.text($scheduleToggle.data('hide'));
    		}
    	});

    	$conf_sch_container.find('.schedule-go-current').on( 'click', function(e) {
			e.preventDefault();

			var $schedule = $(this).closest('.conference-schedule-container').find('.conference-schedule'),
				$sessionInProgress = $schedule.find('.schedule-row.status-in-progress:first');

			if ( $sessionInProgress.length > 0 ){
				$( 'html, body' ).animate({
					scrollTop: $sessionInProgress.offset().top
				}, 500, function() {
					$sessionInProgress.find('*:tabbable:first').focus();
				});
			}
		});

		$conf_sch_container.find('.schedule-go-top').on( 'click', function(e) {
			e.preventDefault();

			var $schedule = $(this).closest('.conference-schedule-container').find('.conference-schedule');
			if ( $schedule.length > 0 ) {

				$( 'html, body' ).animate({
					scrollTop: $schedule.offset().top
				}, 500, function() {
					$schedule.find('*:tabbable:first').focus();
				});
			}
		});

		// Setup refresh button.
		$conf_sch_container.find('.schedule-refresh').on('click',function(e) {
			e.preventDefault();
			$(this).closest('.conference-schedule-container').refresh_conf_sch_container();
		});
    };

	// Invoked by a schedule container.
    $.fn.conf_schedule_add_buttons = function() {
    	var $conf_sch_container = $(this),
    		$conf_schedule = $conf_sch_container.find( '.conference-schedule' );

		// Build the top buttons, which will be duplicated for bottom.
		var $scheduleTopButtons = $('<div class="schedule-nav-buttons nav-top"></div>');
		var $scheduleBottomButtons = $('<div class="schedule-nav-buttons nav-bottom"></div>');

		// Build the side buttons.
		var $scheduleSideButtons = $('<div class="schedule-side-buttons"></div>');

		// Add the "jump" button if event in progress.
		var $inProgress = $conf_schedule.find('.schedule-row.status-in-progress:first');
		if ( $inProgress.length > 0 ) {

			// Create the watch button.
			var $watchSession = $( '<a class="button schedule-video highlight" href="' + conf_sch.watch_url + '"><span>' + conf_sch.watch_message + '</span></a>' );

			// Create "jump to current session" button.
			var $jumpSession = $('<button class="schedule-go-current highlight"><span>' + conf_sch.jump_message + '</span></button>');

			// Add to top buttons.
			$watchSession.clone(true).appendTo( $scheduleTopButtons );
			$jumpSession.clone(true).appendTo( $scheduleTopButtons );

			$scheduleTopButtons.addClass( 'has-highlight' );

			// Add to side buttons.
			$scheduleSideButtons.append( $watchSession );
			$scheduleSideButtons.append( $jumpSession );

		}

		// If viewing location page, add link to view full schedule.
		if ($conf_sch_container.data('location')) {
			var $viewSchedule = $( '<a class="button" href="' + conf_sch.schedule_url + '">' + conf_sch.schedule_message + '</a>' );
			$viewSchedule.clone(true).appendTo( $scheduleTopButtons );
			$scheduleBottomButtons.append( $viewSchedule );
		}

		// Add the speakers button to the top.
		if ( $conf_sch_container.data('speakersCount') > 0 ) {
			var $viewSpeakers = $( '<a class="button" href="' + conf_sch.speakers_url + '">' + conf_sch.speakers_message + '</a>' );
			$viewSpeakers.clone().appendTo( $scheduleTopButtons );
			//$scheduleBottomButtons.append( $viewSpeakers );
		}

		// Add "Go to top" button to side buttons.
        var $goToTop = $('<button class="schedule-go-top"><span>' + conf_sch.top_message + '</span></button>');
        $scheduleSideButtons.append( $goToTop );

        // Add refresh button to side buttons.
		var $refreshButton = $( '<button class="schedule-refresh"><span>' + conf_sch.refresh + '</span></button>');
		$scheduleSideButtons.append( $refreshButton );

        // Add buttons to top of schedule
		$conf_sch_container.find('.conference-schedule-pre').empty().append($scheduleTopButtons);

		// Add buttons to end of schedule.
		$conf_sch_container.find('.conference-schedule-post').empty().append($scheduleBottomButtons).append($scheduleSideButtons);
    };

	// Invoked by a schedule container.
	$.fn.conf_schedule_check_active = function() {
		var $conf_sch_container = $(this);
		if ($conf_sch_container.conf_sch_is_in_viewport()) {
			$conf_sch_container.addClass('active');
		} else {
			$conf_sch_container.removeClass('active').removeAttr('style');
		}
	};

	// Invoked by container.
	$.fn.refresh_conf_sch_container = function() {
		var $conf_sch_container = $(this);

		$conf_sch_container.set_conf_sch_container_loading().render_conference_schedule(true);

		$( window ).on( 'resize.conf_schedule_load, scroll.conf_schedule_load', function(e) {
			$( '.conference-schedule-container.loading' ).each(function(){
				$(this).set_conf_sch_container_loading();
			});
		});
	};

	// Invoked by container.
	$.fn.set_conf_sch_container_loading = function() {
		var $conf_sch_container = $(this),
			$conf_sch_loading = $conf_sch_container.find('.conference-schedule-loading'),
			windowScrollTop = $(window).scrollTop(),
			windowHeight = $(window).height(),
			containerTop = $conf_sch_container.offset().top,
			containerBottom = containerTop + containerHeight,
			containerY = containerTop - windowScrollTop,
			containerHeight = $conf_sch_container.outerHeight(),
			containerLoadHeight = windowHeight,
			containerLoadTop = 0,
			containerLoadCSS = {},
			containerMinHeight = 100;

		if ( containerY > 0 ) {
			containerLoadHeight -= containerY;
		} else if ( containerY < 0 ) {
			containerLoadTop = Math.abs(containerY);
		}

		if ( containerBottom < ( windowScrollTop + windowHeight ) ) {
			containerLoadHeight = (containerHeight - windowScrollTop) + containerTop;
		}

		if (containerLoadHeight < containerMinHeight) {
			containerLoadHeight = containerMinHeight;
		}

		if (containerLoadTop > ( containerHeight - containerMinHeight) ) {
			containerLoadTop = containerHeight - containerMinHeight;
		}

		// Setup the CSS.
		if (containerLoadHeight !== null) {
			containerLoadCSS.height = containerLoadHeight;
		}

		if (containerLoadTop !== null) {
			containerLoadCSS.top = containerLoadTop;
		}

		$conf_sch_loading.css(containerLoadCSS);

		return $conf_sch_container;
	};

	// Returns true if invoked element is in viewport.
	$.fn.conf_sch_is_in_viewport = function() {
		var elementTop = $(this).offset().top,
			elementBottom = elementTop + $(this).outerHeight(),
			viewportTop = $(window).scrollTop(),
			viewportBottom = viewportTop + $(window).height();
		return elementBottom > viewportTop && elementTop < viewportBottom;
	};

	// Format the title.
	Handlebars.registerHelper( 'event_title', function( $options ) {
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
	Handlebars.registerHelper( 'event_excerpt', function( $options ) {

		if ( this.event_type == 'session' ) {
			return null;
		}

		if ( this.excerpt.rendered != '' ) {
			return new Handlebars.SafeString( '<div class="event-excerpt">' + this.excerpt.rendered + '</div>' );
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
