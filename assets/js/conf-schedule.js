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

		// Will hold all "children" events
		var $children_events = [];

		// Get current date/time.
		var current_time = new Date();

		// Get the schedule information
		$.ajax({
			url: conf_sch.wp_api_route + 'schedule',
			success: function( $schedule_items ) {

				// Build the HTML
				var $schedule_html = '';

				// Index by date
				var $schedule_by_dates = {};

				// Go through each item
				$.each( $schedule_items, function( $index, $item ) {

					// If this event is a child, don't add (for now)
                	if ( $item.event_parent > 0 ) {
                		$children_events.push( $item );
                		return true;
                	}

					// Make sure we have a date
					if ( ! ( $item.event_date !== undefined && $item.event_date ) ) {
						return false;
					}

					// Make sure we have a start time
					if ( ! ( $item.event_start_time !== undefined && $item.event_start_time ) ) {
						return false;
					}

					// Build time index
					var $event_time_index = $item.event_start_time;

					// Add end time
					if ( $item.event_end_time ) {
						$event_time_index += ":" + $item.event_end_time;
					}

					// Make sure array exists for the day
					if ( $schedule_by_dates[$item.event_date] === undefined ) {
						$schedule_by_dates[$item.event_date] = {};
					}

					// Make sure time row exists
					if ( $schedule_by_dates[$item.event_date][$event_time_index] === undefined ) {
						$schedule_by_dates[$item.event_date][$event_time_index] = {
							event_date: $item.event_date,
							start_time: $item.event_start_time,
							end_time: $item.event_end_time,
							events: []
						};
					}

					// Add this item by date
					$schedule_by_dates[$item.event_date][$event_time_index]['events'].push( $item );

				});

				// Print out the schedule by date
				$.each( $schedule_by_dates, function( $date, $day_by_time ) {

					// Will hold the day HTML
					var $schedule_day_html = '';

					// Will hold the event day for display
					var $day_display = '';

					// Sort through events by the time
					$.each( $day_by_time, function( $time, $time_items ) {

						// Make sure we have events
						if ( $time_items.events === undefined
							|| typeof $time_items.events != 'object'
							|| $time_items.events.length == 0 ) {
							return false;
						}

						// Will hold the row time for display
						var $row_time_display = '';

						// Build events HTML
						var $row_events = [];

						// Get event types
						var $event_types = [];

						// Add the events
						$.each( $time_items.events, function( $index, $item ) {

							// Get the date
							if ( $day_display == '' && $item.event_date_display ) {
								$day_display = $item.event_date_display;
							}

							// Set the time display to the default time display
							if ( '' == $row_time_display && $item.event_time_display ) {
								$row_time_display = $item.event_time_display;
							}

							// Render the templates
							$row_events.push( $conf_sch_templ( $item ) );

							// Store event types
							if ( $item.event_types && $.isArray( $item.event_types ) ) {
								$.each( $item.event_types, function( $index, $type ) {
									if ( $type != '' && $.inArray( $type, $event_types ) == -1 ) {
										$event_types.push( $type.replace( /\s/, '-' ) );
									}
								});
							}

						});

						// If we have events, add a row
						if ( $row_events.length >= 1 ) {

							// Setup the date/time for the row.
							var row_start_time = new Date( $time_items.event_date );
							var row_end_time = new Date( $time_items.event_date );

							// Split the times into hour and minute.
							if ( null !== $time_items.start_time && $time_items.start_time.search( ':' ) > -1 ) {
								var row_start_time_pieces = $time_items.start_time.split( ':' );
								row_start_time.setHours( row_start_time_pieces[ 0 ], row_start_time_pieces[ 1 ] );
							}

							if ( null !== $time_items.end_time && $time_items.end_time.search( ':' ) > -1 ) {
								var row_end_time_pieces = $time_items.end_time.split( ':' );
								row_end_time.setHours( row_end_time_pieces[ 0 ], row_end_time_pieces[ 1 ] );
							}

							// Assign the class for the schedule row status.
							var schedule_row_status = '';

							if ( row_start_time < current_time && current_time < row_end_time ) {
								schedule_row_status = 'status-in-progress';
							} else if ( current_time >= row_end_time ) {
								schedule_row_status = 'status-past';
							} else {
								schedule_row_status = 'status-future';
							}

							// Will hold the row HTML - start with the time
							var $schedule_row_html = '<div class="schedule-row-item time">' + $row_time_display + '</div>';

							// Add the events
							$schedule_row_html += '<div class="schedule-row-item events">' + $row_events.join( '' ) + '</div>';

							// Wrap the row
							$schedule_row_html = '<div class="schedule-row ' + $event_types.join( ' ' ) + ' ' + schedule_row_status + '">' + $schedule_row_html + '</div>';

							// Add to the day
							$schedule_day_html += $schedule_row_html;

						}

					});

					// Build the column header row
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

					// Add to schedule
					$schedule_html += $schedule_day_html;

				});

				// Add the html.
				$conf_schedule.html( $schedule_html );

			},
			complete: function() {

				// Process the children
            	if ( $children_events.length >= 1 ) {
            		$.each( $children_events, function( $index, $item ) {

            			// Get the parent
            			var $event_parent = $( '#conf-sch-event-' + $item.event_parent );
            			if ( $event_parent.length > 0 ) {

            				// Make sure the parent knows it's a parent
            				$event_parent.addClass( 'event-parent' );

            				// Make sure it has a child div
            				var $event_children = $event_parent.find( '.event-children' );
            				if ( $event_children.length == 0 ) {
            					$event_children = $( '<div class="event-children"></div>' ).appendTo( $event_parent );
            				}

            				// Render the templates
            				$event_children.append( $conf_sch_templ( $item ) );

            			}

            		});
            	}

				// Remove loading status and fade schedule in.
				$conf_sch_container.children().fadeOut();
				$conf_sch_container.removeClass( 'loading' );
				$conf_sch_container.children().fadeIn( 1000 );

			}
		});

	}

	// Format the title
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

	// Format the excerpt
	Handlebars.registerHelper( 'excerpt', function( $options ) {
		var $new_excerpt = this.excerpt.rendered;
		if ( $new_excerpt !== undefined && $new_excerpt ) {
			return new Handlebars.SafeString( '<div class="event-desc">' + $new_excerpt + '</div>' );
		}
		return null;
	});

	// Format the event meta links
	Handlebars.registerHelper( 'event_links', function( $options ) {

		// Build the string
		var $event_links_string = '';

		// Do we have an event hashtag?
		if ( this.event_hashtag !== undefined && this.event_hashtag ) {
			$event_links_string += '<li class="event-twitter"><a href="https://twitter.com/search?q=%23' + this.event_hashtag + '"><i class="conf-sch-icon conf-sch-icon-twitter"></i> <span class="icon-label">#' + this.event_hashtag + '</span></a></li>';
		}

		// Do we have speaker twitters?
		else if ( this.event_speakers !== undefined && this.event_speakers && this.event_speakers.length > 0 ) {
			$.each( this.event_speakers, function( $index, $value ) {
				if ( $value.twitter !== undefined && $value.twitter ) {
					$event_links_string += '<li class="event-twitter"><a href="https://twitter.com/' + $value.twitter + '"><i class="conf-sch-icon conf-sch-icon-twitter"></i> <span class="icon-label">@' + $value.twitter + '</span></a></li>';
				}
			});
		}

		// Do we have a slides URL and is it enabled?
		if ( conf_sch.view_slides !== undefined && conf_sch.view_slides != '' && this.session_slides_url !== undefined && this.session_slides_url ) {
			$event_links_string += '<li class="event-slides"><a href="' + this.session_slides_url + '">' + conf_sch.view_slides + '</span></a></li>';
		}

		// Do we have a feedback URL?
		if ( conf_sch.give_feedback !== undefined && conf_sch.give_feedback != '' && this.session_feedback_url !== undefined && this.session_feedback_url ) {
			$event_links_string += '<li class="event-feedback"><a href="' + this.session_feedback_url + '">' + conf_sch.give_feedback + '</span></a></li>';
		}

		// Do we have a video URL?
		if ( conf_sch.watch_video !== undefined && conf_sch.watch_video != '' && this.session_video_url !== undefined && this.session_video_url ) {
			$event_links_string += '<li class="event-video"><a href="' + this.session_video_url + '">' + conf_sch.watch_video + '</span></a></li>';
		}

		if ( $event_links_string ) {
			return new Handlebars.SafeString( '<ul class="conf-sch-event-links">' + $event_links_string + '</ul>' );
		}
		return null;
	});

})( jQuery );