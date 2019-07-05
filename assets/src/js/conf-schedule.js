(function( $ ) {
	'use strict';

	const KEYMAP = {
		enter: 13,
		space: 32
	};

	const globals = {
		window_resize_scroll: false,
	};

	// When the document is ready...
	$(document).ready(function() {

		// Process each schedule.
		$('.conf-sch-container').each(function(){
			$(this).render_conf_schedule();
		});
	});

	function load_conf_schedule_window_resize_scroll() {
		if (globals.window_resize_scroll) {
			return;
		}
		globals.window_resize_scroll = true;
		$(window).on('resize.conf_schedule_active, scroll.conf_schedule_active', function(e) {
			$('.conf-sch-container').each(function(){
				$(this).conf_schedule_check_active();
				$(this).conf_schedule_check_sticky_header();
			});
		});
	}

	///// FUNCTIONS /////

	$.fn.get_conf_schedule = function() {
		var $conf_sch_container = $(this),
			apiQuery = '';

		// Add date.
		if ( $conf_sch_container.data('date') !== undefined && $conf_sch_container.data('date') != '' ) {
			apiQuery += '?conf_sch_event_date=' +  $conf_sch_container.data('date');
		}

		// Add location.
		if ( $conf_sch_container.data('location') !== undefined && $conf_sch_container.data('location') != '' ) {
			apiQuery += '?conf_sch_event_location=' +  $conf_sch_container.data('location');
		}

		return $.ajax({
			url: conf_sch.wp_api_route + 'schedule' + apiQuery,
			type: 'GET',
			dataType: 'json',
			async: true,
			cache: false
		});
    };

    function get_conf_schedule_proposals() {
    	return $.ajax({
    		url: conf_sch.ajaxurl,
    		type: 'GET',
    		dataType: 'json',
    		async: true,
    		cache: true,
    		data: {
    			action: 'conf_sch_get_proposals'
    		}
    	});
    };

	// Add error message, invoked by container.
	$.fn.print_conf_schedule_error = function(errorMsg) {
		var $conf_sch_container = $(this),
			$contentArea = $conf_sch_container.find('.conference-schedule');

		if ( undefined === errorMsg || '' == errorMsg ) {
			errorMsg = conf_sch.error_msg;
		}

		// Create error container if doesn't exist.
		var $errorArea = $contentArea.find('.conf-sch-error');
		if (!$errorArea.length) {

			// Create the error container.
			$errorArea = $('<div class="conf-sch-error">' + errorMsg + '</div>');

			$contentArea.fadeOut( 500, function() {
				$contentArea.hide().prepend($errorArea);
				$conf_sch_container.addClass('error').removeClass('loading');
				$contentArea.fadeIn(500);
			});
		} else {

			$contentArea.fadeOut( 500, function() {
				$contentArea.hide();
				$errorArea.html(errorMsg);
				$conf_sch_container.addClass('error').removeClass('loading');
				$contentArea.fadeIn(500);
			});
		}
	}

	Date.prototype.getFullMonth = function () {
       if (this.getMonth() < 10) {
           return '0' + this.getMonth();
       }
       return this.getMonth();
    };

	Date.prototype.getFullDate = function () {
       if (this.getDate() < 10) {
           return '0' + this.getDate();
       }
       return this.getDate();
    };

	Date.prototype.getFullHours = function () {
       if (this.getHours() < 10) {
           return '0' + this.getHours();
       }
       return this.getHours();
    };

	Date.prototype.getFullMinutes = function () {
       if (this.getMinutes() < 10) {
           return '0' + this.getMinutes();
       }
       return this.getMinutes();
    };

    function get_conf_sch_item_day_display(date) {
    	return conf_sch_get_weekday( date ) + ', ' + conf_sch_get_month( date ) + ' ' + date.getDate() + ', ' + date.getFullYear();
    }

	// @TODO: setup
    function get_conf_sch_item_full_time_display(item,startDate,endDate) {
    	return item.event_time_display;
    }

    function get_conf_sch_item_time_display(date) {
    	var hour = date.getHours(),
    		display = date.getFullMinutes();
    	if ( hour > 12 ) {
    		display = (hour - 12) + ':' + display + ' p.m.';
    	} else {
    		display = hour + ':' + display;
    		if ( hour == 12 ) {
    			display += ' p.m.';
    		} else {
    			display += ' a.m.';
    		}
    	}
    	return display;
    }

	function sort_conf_schedule_by_day( schedule, header, tzOffset ) {

		// Get current date/time.
		// @TODO reset
		var local_dt = new Date();

		// Current UTC will be used to compare against schedule UTC.
		var currentDTGMT = new Date( Date.UTC( local_dt.getUTCFullYear(), local_dt.getUTCMonth(), local_dt.getUTCDate(), local_dt.getUTCHours(), local_dt.getUTCMinutes(), local_dt.getUTCSeconds() ) );

		var actualOffset = conf_sch_get_timezone_offset( local_dt ),
			displayOffset = 0;

		if ( tzOffset != actualOffset ) {
			displayOffset = tzOffset - actualOffset;
		}

		// Index by day.
		var scheduleByDay = {};

		// Go through each item.
		$.each( schedule, function(index,item) {

			// Make sure we have a date.
			if ( undefined === item.event_dt_gmt || !item.event_dt_gmt ) {
				return true;
			}

			var itemStartDTGMT = conf_sch_get_utc_date( item.event_dt_gmt ),
				itemEndDTGMT = item.event_end_dt_gmt ? conf_sch_get_utc_date( item.event_end_dt_gmt ) : conf_sch_get_utc_date( item.event_dt_gmt );

			if ( displayOffset !== 0 ) {
				itemStartDTGMT = conf_sch_adjust_date_offset( itemStartDTGMT, displayOffset );
				itemEndDTGMT = conf_sch_adjust_date_offset( itemEndDTGMT, displayOffset );
			}

			// Build day index.
			var eventDayIndex = itemStartDTGMT.getFullYear() + '-' + itemStartDTGMT.getFullMonth() + '-' + itemStartDTGMT.getFullDate();

			// Build time index.
			var eventTimeIndex = itemStartDTGMT.getFullHours() + ':' + itemStartDTGMT.getFullMinutes();

			// Add end time.
			eventTimeIndex += ':' + itemEndDTGMT.getFullHours() + ':' + itemEndDTGMT.getFullMinutes();

			// Set if in progress or in the past.
			var inProgress = false,
				inPast = false,
				inFuture = false;

			if (currentDTGMT >= itemStartDTGMT) {

				if (currentDTGMT < itemEndDTGMT) {
					inProgress = true;
				} else {
					inPast = true;
				}
			} else {
				inFuture = true;
			}

			// Make sure array exists for the day.
			if (undefined === scheduleByDay[eventDayIndex]) {

				scheduleByDay[eventDayIndex] = {
					start_dt: itemStartDTGMT,
					end_dt: itemEndDTGMT,
					displayOffset: displayOffset,
					day: conf_sch_get_weekday( itemStartDTGMT ),
					day_display: get_conf_sch_item_day_display( itemStartDTGMT ),
					eventTypes: [item.event_type],
					header: header,
					inProgress: inProgress,
					inPast: inPast,
					inFuture: inFuture,
					rows: {},
					children: []
				};
			} else {

				// Add event type
                if (item.event_type) {
                	if($.inArray(item.event_type,scheduleByDay[eventDayIndex].eventTypes) < 0) {
                    	scheduleByDay[eventDayIndex].eventTypes.push(item.event_type);
            		}
            	}

            	if ( inProgress && !scheduleByDay[eventDayIndex].inProgress) {
            		scheduleByDay[eventDayIndex].inProgress = inProgress;
            	}

            	if ( inPast && !scheduleByDay[eventDayIndex].inPast) {
					scheduleByDay[eventDayIndex].inPast = inPast;
				}

				if ( inFuture && !scheduleByDay[eventDayIndex].inFuture) {
					scheduleByDay[eventDayIndex].inFuture = inFuture;
				}

				if ( itemEndDTGMT > scheduleByDay[eventDayIndex].end_dt ) {
					scheduleByDay[eventDayIndex].end_dt = itemEndDTGMT;
				}
			}

			// Setup event links.
			item.event_links = conf_sch_get_item_links(item);

			// Add display offset.
			item.displayOffset = displayOffset;

			// If this event is a child, don't add (for now).
			if (item.parent > 0) {
				scheduleByDay[eventDayIndex].children.push(item);
			} else {

				// Make sure time row exists.
				if (undefined === scheduleByDay[eventDayIndex].rows[eventTimeIndex]) {

					// Set time row.
					scheduleByDay[eventDayIndex].rows[eventTimeIndex] = {
						date: eventDayIndex,
						start_dt: itemStartDTGMT,
						end_dt: itemEndDTGMT,
						displayOffset: displayOffset,
						start_time_display: get_conf_sch_item_time_display( itemStartDTGMT ),
						end_time_display: get_conf_sch_item_time_display( itemEndDTGMT ),
						eventTypes: [item.event_type],
						header: header,
						inProgress: inProgress,
						inPast: inPast,
						inFuture: inFuture,
						events: []
					};
				} else {

					if (itemEndDTGMT > scheduleByDay[eventDayIndex].rows[eventTimeIndex].end_dt){
						scheduleByDay[eventDayIndex].rows[eventTimeIndex].end_dt = itemEndDTGMT;
					}
				}

				// Add event type.
            	if (item.event_type) {
            		if($.inArray(item.event_type,scheduleByDay[eventDayIndex].rows[eventTimeIndex].eventTypes) < 0) {
                    	scheduleByDay[eventDayIndex].rows[eventTimeIndex].eventTypes.push(item.event_type);
					}
				}

				scheduleByDay[eventDayIndex].rows[eventTimeIndex].events.push(item);

			}
		});

		// Process the children.
		for (var dayKey in scheduleByDay) {

			if (!scheduleByDay.hasOwnProperty(dayKey)) {
				continue;
			}

			var day = scheduleByDay[dayKey];
			if (!day) {
				continue;
			}

			if (!day.children || !day.children.length){
				continue;
			}

			$.each(day.children, function(index,child) {

				if (!child.parent || !day.rows) {
					return false;
				}

				for (var timeRowKey in day.rows) {

					if (!day.rows.hasOwnProperty(timeRowKey)) {
						continue;
					}

					var timeRow = day.rows[timeRowKey];
					if (!timeRow) {
						continue;
					}

					if (!timeRow.events.length) {
						continue;
					}

					$.each(timeRow.events,function(index,event){
						if (event.id === child.parent) {

							if (null === event.event_children) {
								event.event_children = [];
							}

							event.event_children.push(child);
						}
					});
				}
			});
		}

		return scheduleByDay;
	}

	// Populate the schedule
	$.fn.populate_conf_schedule = function(schedule,the_proposals) {
		var $conf_sch_container = $(this),
			$conf_schedule = $conf_sch_container.find('.conference-schedule'),
			conf_sch_templ = null,
			conf_sch_ls_templ = null;

		// Make sure the schedule is valid.
		if ( undefined === schedule || '' == schedule || ! schedule.length ) {
			$conf_sch_container.print_conf_schedule_error();
			return false;
		}

		// Get the template.
		var conf_sch_templ_content = $( '#conference-schedule-template' ).html();
		if ( conf_sch_templ_content !== undefined && conf_sch_templ_content ) {
			conf_sch_templ = Handlebars.compile( conf_sch_templ_content );
		}

		// Get the templates.
		var conf_sch_ls_templ_content = $('#conf-schedule-watch-list-template').html();
		if ( conf_sch_ls_templ_content !== undefined && conf_sch_ls_templ_content ) {
			conf_sch_ls_templ = Handlebars.compile( conf_sch_ls_templ_content );
		}

		// No point if no template.
		if ( ! conf_sch_templ ) {
			$conf_sch_container.print_conf_schedule_error();
			return false;
		}

		// Get the offset (default is site offset).
		var tzOffset = $conf_sch_container.get_conf_schedule_tz_offset();

		// Holds count of how many sessions have speakers.
        var scheduleSpeakersCount = 0;

		// Process the proposals.
		var proposals = {};
		$.each(the_proposals, function(index,proposal) {
			if (proposal.ID) {
				proposals['proposal'+proposal.ID] = proposal;
			}
		});

		// Place the proposals in the schedule.
		$.each( schedule, function(index,item) {

			// If we're a session, make sure we have a proposal.
			var proposal = null;
			if ( 'session' == item.event_type ) {

				if ( item.proposal > 0 && ( 'proposal' + item.proposal ) in proposals ) {
					proposal = proposals['proposal' + item.proposal];
				}

				// If no proposal or not confirmed, update information.
				if ( ! proposal || 'confirmed' != proposal.proposal_status ) {
					item = conf_schedule_reset_schedule_item(item);
				} else {

					item = conf_schedule_update_schedule_item_from_proposal(item,proposal);

					// Lets us know we have speakers.
					if (item.speakers.length) {
						scheduleSpeakersCount += item.speakers.length;
					}
				}
			}
		});

		// Do we have a specific header?
		var header = $conf_sch_container.data('header');

		// Get the schedule, sorted by day.
		var scheduleByDay = sort_conf_schedule_by_day( schedule, header, tzOffset );

		if (undefined === scheduleByDay || '' == scheduleByDay || $.isEmptyObject(scheduleByDay)) {
			$conf_sch_container.print_conf_schedule_error();
			return false;
		}

        // Update the schedule.
       	$conf_schedule.html(conf_sch_templ(scheduleByDay));

       	var $conf_sch_watch_list = $conf_sch_container.find( '.conference-schedule-watch-list' );
       	if ($conf_sch_watch_list.length) {

       		// Build the HTML.
       		var livestream_list_html = '';

       		// Go through each item.
			$.each( schedule, function( index, item ) {

				/*
				 * Only active sessions will have a URL
				 * that's either a string or null.
				 *
				 * Inactive sessions wil be marked as false.
				 *
				 * @TODO this could be a problem for schedule
				 * items that aren't sessions, like "Lunch".
				 */
				if ( 'session' == item.event_type && item.session_livestream_url !== false ) {

					// Render the templates.
					livestream_list_html += conf_sch_ls_templ(item);

				}
			});

			// Add a header.
			if (!$conf_sch_container.find('.current-sessions-header').length) {
				$('<h2 class="current-sessions-header">Current Sessions</h2>').insertBefore($conf_sch_watch_list);
			}

			if ( ! livestream_list_html ) {
				livestream_list_html = '<p class="conf-sch-watch-message"><em>' + conf_sch.no_streams + '</em></p>';
			}

			/*if (!$conf_sch_container.find('.up-next-header').length) {
				$('<h2 class="up-next-header">Up Next</h2>').insertAfter($conf_sch_watch_list);
			}*/

       		$conf_sch_watch_list.html(livestream_list_html);

       	}

		// Store data.
		$conf_sch_container.data('speakersCount', scheduleSpeakersCount);

		// Add timezone filter.
		$conf_sch_container.conf_schedule_add_tz_filter( tzOffset );

		// Add buttons.
		$conf_sch_container.conf_schedule_add_buttons();

		// Setup actions.
		$conf_sch_container.conf_schedule_add_actions();

		// Remove load events.
		$( window ).off( 'resize.conf_schedule_load, scroll.conf_schedule_load' );

		// Remove loading status and fade schedule in.
		$conf_sch_container.removeClass('loading');

		// Reset loading.
		$conf_sch_container.find('.conf-sch-loading').removeAttr('style');

		// Check if container is "active".
		$conf_sch_container.conf_schedule_check_active();
		$conf_sch_container.conf_schedule_check_sticky_header();

		// Load window resize/scroll events.
		load_conf_schedule_window_resize_scroll();

		// Update the schedule every 10 minutes.
		var refreshSchedule = setTimeout(function(){
			clearTimeout(refreshSchedule);

			// @TODO: Reset focus after refresh?
			$conf_sch_container.refresh_conf_sch_container();

		}, 600000);

		// @TODO: remove
		//conf_sch_end_tracking();
	};

	// Invoked by a container.
	$.fn.get_conf_schedule_tz_offset = function() {
		var $conf_sch_container = $(this);
		if ( undefined !== $conf_sch_container.data( 'tzoffset' ) && '' != $conf_sch_container.data( 'tzoffset' ) ) {
			return parseInt( $conf_sch_container.data( 'tzoffset' ) );
		}
		return conf_sch_get_timezone_offset();
	}

	// Invoked by a schedule container.
	$.fn.render_conf_schedule = function( refresh ) {
		var dfd = $.Deferred(),
			$conf_sch_container = $(this);

		// @TODO: remove
		//conf_sch_start_tracking();

		$conf_sch_container.addClass('loading');

		// Get the schedule.
		const getSchedule = $conf_sch_container.get_conf_schedule();
		getSchedule.done(function(schedule){

			const getProposals = get_conf_schedule_proposals();
            getProposals.done(function(proposals){

				// Populate the schedule.
				$conf_sch_container.populate_conf_schedule(schedule,proposals);

				dfd.resolve($conf_sch_container);
			});
		});

		return dfd.promise();
	};

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

    	$conf_sch_container.find('.schedule-go-current').on('click keyup', function(e) {

			// If true, give focus after get to current.
			var giveFocus = false;

			if ('keyup' == e.type) {

				// If "keyup", only work for enter or space.
				if($.inArray(e.keyCode,[KEYMAP.enter,KEYMAP.space]) < 0) {
					return;
				}

				e.preventDefault();

				// Since using keyboard, give focus.
				giveFocus = true;

			} else {
				e.preventDefault();
			}

			var $schedule = $(this).closest('.conf-sch-container').find('.conference-schedule'),
				$sessionInProgress = $schedule.find('.schedule-row.status-in-progress:first');

			if ( $sessionInProgress.length > 0 ){
				$('html,body').animate({
					scrollTop: $sessionInProgress.offset().top
				}, 500, function() {
					if (giveFocus) {
						$sessionInProgress.find('*:tabbable:first').focus();
					}
				});
			}
		});

		$conf_sch_container.find('.schedule-go-top').on('click keyup', function(e) {

			// If true, give focus after get to current.
			var giveFocus = false;

			if ('keyup' == e.type) {

				// If "keyup", only work for enter or space.
				if($.inArray(e.keyCode,[KEYMAP.enter,KEYMAP.space]) < 0) {
					return;
				}

				e.preventDefault();

				// Since using keyboard, give focus.
				giveFocus = true;

			} else {
				e.preventDefault();
			}

			var $schedule = $(this).closest('.conf-sch-container').find('.conference-schedule');
			if ( $schedule.length > 0 ) {

				$( 'html, body' ).animate({
					scrollTop: $schedule.offset().top
				}, 500, function() {
					if (giveFocus) {
						$schedule.find('*:tabbable:first').focus();
					}
				});
			}
		});

		// Setup refresh button.
		$conf_sch_container.find('.schedule-refresh').on('click keyup',function(e) {

			// If true, give focus after get to current.
			var giveFocus = false;

			if ('keyup' == e.type) {

				// If "keyup", only work for enter or space.
				if($.inArray(e.keyCode,[KEYMAP.enter,KEYMAP.space]) < 0) {
					return;
				}

				e.preventDefault();

				// Since using keyboard, give focus.
				giveFocus = true;

			} else {
				e.preventDefault();
			}

			var refreshButton = $(this),
				refreshButtonIndex = giveFocus ? $conf_sch_container.find('.schedule-refresh').index(refreshButton) : 0;

			const refreshSchedule = refreshButton.closest('.conf-sch-container').refresh_conf_sch_container();
            refreshSchedule.done(function($container){

            	// Return focus to the refresh button.
            	if (giveFocus) {
            		$container.find('.schedule-refresh').eq(refreshButtonIndex).focus();
            	}
            });
		});
    };

    /*function conf_sch_get_local_timezone_name() {
    	const timezone = jstz.determine();
    	return timezone.name();

    	*//*const offsetMinutes = conf_sch_get_timezone_offset(),
    		timezones = conf_schedule_get_timezones();
    	var tzLabel = '';

		for (var i = 0; i < timezones.length; i++) {
			var tz = timezones[i];
			if ( offsetMinutes === tz.offset ) {
				tzLabel = tz.label;
				break;
			}
		}

		// Pull the timezone from the library.
		if ( ! tzLabel ) {
			const timezone = jstz.determine();
			tzLabel = timezone.name();
		}

		return tzLabel;*//*
    }*/

    // Invoked by a schedule container.
	$.fn.conf_schedule_add_tz_filter = function( tzOffset ) {
		var $conf_sch_container = $(this),
			$conf_schedule_pre = $conf_sch_container.find('.conf-sch-pre'),
			$messageContainer = $( '<div class="conf-sch-tz-message"></div>' );

		// Build timezone dropdown
		var timezones = conf_schedule_get_timezones();

		// Are we in daylight savings?
		var date = new Date(),
			isDstObserved = date.isDstObserved();

		var $timezoneDropdown = $( '<select class="conf-sch-tz-filter" aria-label="Select the timezone for the schedule."></select>' );
		timezones.forEach(function( value, index ) {
			var offset = value.offset,
				label = value.label ? value.label : '';

			// @TODO daylight is no longer set. Where did that come from?
			/*if ( isDstObserved && daylight.offset ) {
				offset = daylight.offset;
			}*/
			
			var offsetMessage = conf_sch_get_offset_message( offset );

			if ( label ) {
				label += ' (' + offsetMessage + ')';
			} else {
				label = offsetMessage;
			}

			var $option = $( '<option value="' + offset + '">' + label + '</option>' );

			if ( tzOffset === offset ) {
				$option.prop( 'selected', true );
			}
			$timezoneDropdown.append( $option );
		});

		$timezoneDropdown.on( 'change', function(e) {
			e.preventDefault();

			$conf_sch_container.data( 'tzoffset', $(this).val() );

			const refreshSchedule = $conf_sch_container.refresh_conf_sch_container();
			refreshSchedule.done(function( $container ) {

				// Return focus to the filter.
				$container.find( '.conf-sch-tz-filter' ).focus();
			});
		})

		var message = '<span class="conf-sch-tz-label">All times are listed in:</span> ';

		$messageContainer.html( message ).append( $timezoneDropdown );

		if ( $conf_schedule_pre.find( '.conf-sch-tz-message' ).length > 0 ) {
			$conf_schedule_pre.find( '.conf-sch-tz-message' ).replaceWith( $messageContainer );
		} else {
			$conf_schedule_pre.append( $messageContainer );
		}
    }

	// Invoked by a schedule container.
    $.fn.conf_schedule_add_buttons = function() {
    	var $conf_sch_container = $(this),
    		$conf_schedule = $conf_sch_container.find( '.conference-schedule' ),
    		$conf_schedule_pre = $conf_sch_container.find('.conf-sch-pre'),
    		$conf_schedule_post = $conf_sch_container.find('.conf-sch-post');

		// Build the top buttons, which will be duplicated for bottom.
		var $scheduleTopButtons = $('<div class="schedule-nav-buttons nav-top"></div>');
		var $scheduleBottomButtons = $('<div class="schedule-nav-buttons nav-bottom"></div>');

		// Build the side buttons.
		var $scheduleSideButtons = $('<div class="schedule-side-buttons"></div>');

		// Add the "jump" button if event in progress.
		var $inProgress = $conf_schedule.find('.schedule-row.status-in-progress:first');
		if ( $inProgress.length > 0 ) {

			// Add the watch button.
			if ( ! conf_sch.is_watch_page && $('.schedule-event .event-link.event-livestream').length > 0) {
				var $watchSession = $( '<a class="button schedule-video highlight" href="' + conf_sch.watch_url + '"><span>' + conf_sch.watch_message + '</span></a>' );
				$watchSession.clone(true).appendTo( $scheduleTopButtons );
				$scheduleSideButtons.append( $watchSession );
			}

			// Add "jump to current session" button.
			var $jumpSession = $('<button class="schedule-go-current highlight"><span>' + conf_sch.jump_message + '</span></button>');
			$jumpSession.clone(true).appendTo( $scheduleTopButtons );
			$scheduleSideButtons.append( $jumpSession );

			$scheduleTopButtons.addClass( 'has-highlight' );

		}

		// If viewing location page, add link to view full schedule.
		/*if ($conf_sch_container.data('location')) {
			var $viewSchedule = $( '<a class="button" href="' + conf_sch.schedule_url + '">' + conf_sch.schedule_message + '</a>' );
			$viewSchedule.clone(true).appendTo( $scheduleTopButtons );
			$scheduleBottomButtons.append( $viewSchedule );
		}*/

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
        if ( $conf_schedule_pre.find( '.schedule-nav-buttons' ).length > 0 ) {
        	$conf_schedule_pre.find( '.schedule-nav-buttons' ).replaceWith( $scheduleTopButtons );
        } else {
        	$conf_schedule_pre.append($scheduleTopButtons);
        }

		// Add buttons to end of schedule.
		if ( $conf_schedule_post.find( '.schedule-nav-buttons' ).length > 0 ) {
			$conf_schedule_post.find( '.schedule-nav-buttons' ).replaceWith( $scheduleBottomButtons ) ;
		} else {
			$conf_schedule_post.append( $scheduleBottomButtons ).append( $scheduleSideButtons );
		}

		// Add buttons to side of schedule.
		if ( $conf_schedule_post.find( '.schedule-side-buttons' ).length > 0 ) {
			$conf_schedule_post.find( '.schedule-side-buttons' ).replaceWith( $scheduleSideButtons ) ;
		} else {
			$conf_schedule_post.append( $scheduleSideButtons );
		}
    };

    // Invoked by a schedule container.
	$.fn.conf_schedule_check_sticky_header = function() {
		var $conf_sch_container = $(this),
			$day_headers = $conf_sch_container.find('.conference-schedule .schedule-by-day .schedule-header'),
			stickyHeaderActive = false;
		$day_headers.each(function(){
			if ($(this).conf_sch_is_at_or_above_viewport()) {
				stickyHeaderActive = true;
				$conf_sch_container.enable_sticky_day_header($(this));
			}
		});
		if (!stickyHeaderActive) {
			$conf_sch_container.disable_sticky_day_header();
		}
	};

	// Invoked by a schedule container.
    $.fn.enable_sticky_day_header = function($day_header) {
		var $conf_sch_container = $(this),
			stickySelector = 'conf-sch-header-sticky',
			$sticky_day_header = $conf_sch_container.find('.'+stickySelector),
			$clone_header = $day_header.clone();
		if (!$sticky_day_header.length) {
			$sticky_day_header = $('<div></div>').addClass(stickySelector).attr('aria-hidden','true');
			$sticky_day_header.html($clone_header);
			$conf_sch_container.append($sticky_day_header);
		} else {
			$sticky_day_header.html($clone_header);
		}
		$conf_sch_container.position_sticky_day_header();
		$sticky_day_header.addClass('active');
    };

    // Invoked by a schedule container.
    $.fn.disable_sticky_day_header = function() {
		$(this).find('.conf-sch-header-sticky').removeClass('active');
    };

	// Invoked by a schedule container.
	$.fn.position_sticky_day_header = function() {
		var $conf_sch_container = $(this);
		$conf_sch_container.find('.conf-sch-header-sticky').css({
			left: $conf_sch_container.offset().left,
			width: $conf_sch_container.outerWidth()
		});
	};

	// Invoked by a schedule container.
	$.fn.conf_schedule_check_active = function() {
		var $conf_sch_container = $(this);

		if ( $conf_sch_container.hasClass('loading') || ! $conf_sch_container.conf_sch_is_in_viewport() ) {
			$conf_sch_container.removeClass('active').removeAttr('style');
		} else {
			$conf_sch_container.addClass('active');
		}
	};

	// Invoked by container.
	$.fn.refresh_conf_sch_container = function() {
		var $conf_sch_container = $(this);

		$(window).on('resize.conf_schedule_load, scroll.conf_schedule_load', function(e) {
			$('.conf-sch-container.loading').each(function(){
				$(this).set_conf_sch_container_loading();
			});
		});

		$conf_sch_container.set_conf_sch_container_loading();

		$conf_sch_container.disable_sticky_day_header();

		return $conf_sch_container.render_conf_schedule( true );
	};

	// Invoked by container.
	$.fn.set_conf_sch_container_loading = function() {
		var $conf_sch_container = $(this),
			$conf_sch_loading = $conf_sch_container.find('.conf-sch-loading'),
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
	$.fn.conf_sch_is_at_or_above_viewport = function() {
		var elementTop = $(this).offset().top,
			viewportTop = $(window).scrollTop();
		return elementTop <= viewportTop;
	};

	// Returns true if invoked element is in viewport.
	$.fn.conf_sch_is_in_viewport = function() {
		var elementTop = $(this).offset().top,
			elementBottom = elementTop + $(this).outerHeight(),
			viewportTop = $(window).scrollTop(),
			viewportBottom = viewportTop + $(window).height();
		return elementBottom > viewportTop && elementTop < viewportBottom;
	};

	// @TODO I modified
	Handlebars.registerHelper( 'toggle_show_button', function(options) {
		/*var showLabel = 'Show ' + this.day + "'" + 's past events',
			hideLabel = 'Hide ' + this.day + "'" + 's past events';*/
		var showLabel = 'Show past sessions',
			hideLabel = 'Hide past sessions';
		return new Handlebars.SafeString('<button class="schedule-show-toggle" data-show="' + showLabel + '" data-hide="' + hideLabel + '">' + showLabel + '</button>');
	});

	// Format the title.
	Handlebars.registerHelper( 'event_title', function(options) {
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
	Handlebars.registerHelper( 'event_excerpt', function(options) {

		if ( this.event_type == 'session' ) {
			return null;
		}

		if ( this.excerpt.rendered != '' ) {
			return new Handlebars.SafeString( '<div class="event-excerpt">' + this.excerpt.rendered + '</div>' );
		}

		return null;
	});

	Handlebars.registerHelper( 'event_children_class', function(options) {
		if (!this.event_children) {
			return '';
		}

		var classes = [];

		var childTime = null, sameTime = true,
			childLocation = null, sameLocation = true;
		$.each(this.event_children,function(index,child){

			if (false !== sameTime) {
				if (null === childTime) {
					childTime = child.event_dt_gmt;
				} else if (child.event_dt_gmt != childTime) {
					sameTime = false;
				}
			}

			if (false !== sameLocation) {
				if (!child.event_location || !child.event_location.ID){
					sameLocation = false;
				} else if (null === childLocation) {
					childLocation = child.event_location.ID;
				} else if (child.event_location.ID != childLocation) {
					sameLocation = false;
				}
			}
		});

		if (true === sameTime) {
			classes.push('has-same-time');
		}

		if (true === sameLocation) {
			classes.push('has-same-location');
		}

		return ' ' + classes.join(' ');
	});

	Handlebars.registerHelper( 'schedule_event_class', function(options) {
		var classes = [];

		if (this.parent){
			classes.push('event-child');
		}

		if (this.event_type){
			classes.push(this.event_type);
		}

		if (this.event_children){
			classes.push('event-parent')
		}

		return ' ' + classes.join(' ');
	});

	Handlebars.registerHelper( 'event_links_class', function(options) {
		if (!this.event_links){
			return null;
		}
		var linkCount = 0;
		for (var key in this.event_links) {
			if (!this.event_links.hasOwnProperty(key)) {
				continue;
			}
			var obj = this.event_links[key];
			if ($.isArray(obj)){
				linkCount += obj.length;
			} else {
				linkCount++;
			}

		}
		return linkCount > 0 ? ' has-event-links has-event-links-' + linkCount : '';
	});
})(jQuery);
