(function( $ ) {
	'use strict';

	// When the document is ready...
	$(document).ready(function() {

		// Set our date picker.
		var sch_date_field = $( '.conf-sch-date-field' );
		if ( sch_date_field.length > 0 ) {
			sch_date_field.datepicker({
				altField: '#conf-sch-date-alt',
				altFormat: 'yy-mm-dd'
			});
		}

		// When date is cleared, be sure to clear the altField.
		$( '#conf-sch-date' ).on( 'change', function() {
			if ( '' == $(this).val() ) {
				$( '#conf-sch-date-alt' ).val( '' );
			}
		});

		// Set our time picker.
		var sch_time_field = $( '.conf-sch-time-field' );
		if ( sch_time_field.length > 0 ) {
			sch_time_field.timepicker({
				step: 15,
				timeFormat: 'g:i a',
				minTime: '5:00 am',
			});
		}

		// Take care of the end time field.
		var sch_end_time = $( '#conf-sch-end-time' );
		if ( sch_end_time.length > 0 ) {

			// Run some code when the start time changes.
			$( '#conf-sch-start-time' ).on( 'changeTime', function() {

				// Change settings for end time.
				sch_end_time.timepicker( 'option', 'minTime', $(this).val() );

			});

			// Change settings for end time.
			sch_end_time.timepicker( 'option', 'showDuration', true );
			sch_end_time.timepicker( 'option', 'durationTime', function() { return $( '#conf-sch-start-time' ).val() } );

		}

		// Setup the select2 fields.
		$( '#conf-sch-event-types' ).select2();
		$( '#conf-sch-session-categories' ).select2();
		$( '#conf-sch-location' ).select2();
		$( '#conf-sch-speakers' ).select2();

		// Populate the events and refresh when you click.
		conf_sch_populate_events();
		$( '.conf-sch-refresh-events' ).on( 'click', function( $event ) {
			$event.preventDefault();
			conf_sch_populate_events();
			return false;
		});

		// Populate the event types and refresh when you click.
		conf_sch_populate_event_types();
		$( '.conf-sch-refresh-event-types' ).on( 'click', function( $event ) {
			$event.preventDefault();
			conf_sch_populate_event_types();
			return false;
		});

		// Populate the session categories and refresh when you click.
		conf_sch_populate_session_categories();
		$( '.conf-sch-refresh-session-categories' ).on( 'click', function( $event ) {
			$event.preventDefault();
			conf_sch_populate_session_categories();
			return false;
		});

		// Populate the locations and refresh when you click.
		conf_sch_populate_locations();
		$( '.conf-sch-refresh-locations' ).on( 'click', function( $event ) {
			$event.preventDefault();
			conf_sch_populate_locations();
			return false;
		});

		// Populate the speakers and refresh when you click.
		conf_sch_populate_speakers();
		$( '.conf-sch-refresh-speakers' ).on( 'click', function( $event ) {
			$event.preventDefault();
			conf_sch_populate_speakers();
			return false;
		});

		// Remove the slides file.
		$( '.conf-sch-slides-file-remove' ).on( 'click', function( $event ) {
			$event.preventDefault();

			// Hide the info.
			$( '#conf-sch-slides-file-info' ).hide();

			// Show the file input, clear it out, and add a hidden input to let the admin know to clear the DB.
			$( '#conf-sch-slides-file-input' ).show().val( '' ).after( '<input type="hidden" name="conf_schedule_event_delete_slides_file" value="1" />' );

		});

	});

	// Populate the event.
	function conf_sch_populate_events() {

		// Set the <select> field and disable.
		var $events_select = $( '#conf-sch-event-parent' );

		// Only if the select exists.
		if ( 0 == $events_select.length ) {
			return;
		}

		// Disable the select until it loads.
		$events_select.prop( 'disabled', 'disabled' );

		// Get the field information.
		$.ajax({
			url: conf_sch.wp_api_route + 'schedule?filter[posts_per_page]=-1&filter[conf_sch_ignore_clause_filter]=1',
			success: function( $select_data ) {

				// Make sure we have info.
				if ( undefined === $select_data || '' == $select_data ) {
					return false;
				}

				// Reset the <select>.
				$events_select.empty();

				// Add default/blank <option>.
				if ( $events_select.data( 'default' ) != '' ) {
					$events_select.append( '<option value="">' + $events_select.data( 'default' ) + '</option>' );
				}

				// Add the options.
				$.each( $select_data, function( index, value ) {

					// Don't include current event.
					if ( undefined !== conf_sch.post_id && conf_sch.post_id == value.id ) {
						return;
					}

					// Build title string.
					var $event_title = value.title.rendered;

					// Add the option.
					$events_select.append( '<option value="' + value.id + '">' + $event_title + '</option>' );

				});

				// See what is selected for this particular post.
				if ( undefined !== conf_sch.post_id && conf_sch.post_id > 0 ) {
					$.ajax({
						url: conf_sch.wp_api_route + 'schedule/' + conf_sch.post_id,
						success: function( $event ) {

							// Make sure we have info.
							if ( undefined === $event.event_parent || '' == $event.event_parent ) {
								return false;
							}

							// Mark the location as selected.
							$events_select.find( 'option[value="' + $event.event_parent + '"]' ).attr( 'selected', true ).trigger( 'change' );

						}
					});
				}

				// Enable the select.
				$events_select.prop( 'disabled', false ).trigger( 'change' );

			}
		});

	}

	// Populate the event types.
	function conf_sch_populate_event_types() {

		// Set the <select> and disable.
    	var $event_types_select = $( '#conf-sch-event-types' );

    	// Only if the select exists.
		if ( 0 == $event_types_select.length ) {
			return;
		}

		// Disable the select until it loads.
    	$event_types_select.prop( 'disabled', 'disabled' );

		// Get the event types information.
		$.ajax({
			url: conf_sch.wp_api_route + 'event_types?number=-1',
			success: function( $types ) {

				// Make sure we have info.
				if ( undefined === $types || '' == $types ) {
					return false;
				}

				// Reset the <select>.
				$event_types_select.empty();

				// Add default/blank <option>.
				if ( $event_types_select.data( 'default' ) != '' ) {
					$event_types_select.append( '<option value="">' + $event_types_select.data( 'default' ) + '</option>' );
				}

				// Add the options.
				$.each( $types, function( index, value ) {
					$event_types_select.append( '<option value="' + value.id + '">' + value.name + '</option>' );
				});

				// See what event types are selected for this particular post.
				if ( undefined !== conf_sch.post_id && conf_sch.post_id > 0 ) {
					$.ajax({
						url: conf_sch.wp_api_route + 'event_types?post=' + conf_sch.post_id + '&number=-1',
						success: function( $selected_event_types ) {

							// Make sure we have info.
							if ( undefined === $selected_event_types || '' == $selected_event_types ) {
								return false;
							}

							// Mark the options selected.
							$.each( $selected_event_types, function( index, value ) {
								$event_types_select.find( 'option[value="' + value.id + '"]' ).attr( 'selected', true ).trigger( 'change' );
							});

						}
					});
				}

				// Enable the select.
				$event_types_select.prop( 'disabled', false ).trigger( 'change' );

			}
		});

	}

	// Populate the session categories.
	function conf_sch_populate_session_categories() {

		// Set the <select> and disable.
		var $categories_select = $( '#conf-sch-session-categories' );

		// Only if the select exists.
		if ( 0 == $categories_select.length ) {
			return;
		}

		// Disable the select until it loads.
		$categories_select.prop( 'disabled', 'disabled' );

		// Get the session categories information.
		$.ajax({
			url: conf_sch.wp_api_route + 'session_categories?number=-1',
			success: function( $categories ) {

				// Make sure we have info.
				if ( undefined === $categories || '' == $categories ) {
					return false;
				}

				// Reset the <select>.
				$categories_select.empty();

				// Add default/blank <option>.
				if ( $categories_select.data( 'default' ) != '' ) {
					$categories_select.append( '<option value="">' + $categories_select.data( 'default' ) + '</option>' );
				}

				// Add the options.
				$.each( $categories, function( index, value ) {
					$categories_select.append( '<option value="' + value.id + '">' + value.name + '</option>' );
				});

				// See what session categories are selected for this particular post.
				if ( undefined !== conf_sch.post_id && conf_sch.post_id > 0 ) {
					$.ajax({
						url: conf_sch.wp_api_route + 'session_categories?post=' + conf_sch.post_id + '&number=-1',
						success: function( $selected_categories ) {

							// Make sure we have info.
							if ( undefined === $selected_categories || '' == $selected_categories ) {
								return false;
							}

							// Mark the options selected.
							$.each( $selected_categories, function( index, value ) {
								$categories_select.find( 'option[value="' + value.id + '"]' ).attr( 'selected', true ).trigger( 'change' );
							});

						}
					});
				}

				// Enable the select.
                $categories_select.prop( 'disabled', false ).trigger( 'change' );

			}
		});

	}

	// Populate the locations.
	function conf_sch_populate_locations() {

		// Set the <select> and disable.
		var $locations_select = $( '#conf-sch-location' );

		// Only if the select exists.
		if ( 0 == $locations_select.length ) {
			return;
		}

		// Disable the select until it loads.
		$locations_select.prop( 'disabled', 'disabled' );

		// Get the field information.
		$.ajax({
			url: conf_sch.wp_api_route + 'locations?filter[posts_per_page]=-1',
			success: function( $select_data ) {

				// Make sure we have info.
				if ( undefined === $select_data || '' == $select_data ) {
					return false;
				}

				// Reset the <select>.
				$locations_select.empty();

				// Add default/blank <option>.
				if ( $locations_select.data( 'default' ) != '' ) {
					$locations_select.append( '<option value="">' + $locations_select.data( 'default' ) + '</option>' );
				}

				// Add the options.
				$.each( $select_data, function( index, value ) {
					$locations_select.append( '<option value="' + value.id + '">' + value.title.rendered + '</option>' );
				});

				// See what is selected for this particular post.
				if ( undefined !== conf_sch.post_id && conf_sch.post_id > 0 ) {
					$.ajax({
						url: conf_sch.wp_api_route + 'schedule/' + conf_sch.post_id,
						success: function( $event ) {

							// Make sure we have info.
							if ( undefined === $event.event_location || '' == $event.event_location ) {
								return false;
							}

							// Mark the location as selected.
							$locations_select.find( 'option[value="' + $event.event_location.ID + '"]' ).attr( 'selected', true ).trigger( 'change' );

						}
					});
				}

				// Enable the select.
				$locations_select.prop( 'disabled', false ).trigger( 'change' );

			}
		});

	}

	// Populate the speakers field.
	function conf_sch_populate_speakers() {

		// Set the <select> and disable.
        var $speakers_select = $( '#conf-sch-speakers' );

		// Only if the select exists.
		if ( 0 == $speakers_select.length ) {
			return;
		}

		// Disable the select until it loads.
		$speakers_select.prop( 'disabled', 'disabled' );

		// Get the speakers information.
		$.ajax( {
			url: ajaxurl,
			type: 'GET',
			dataType: 'json',
			async: true,
			cache: false,
			data: {
				action: 'conf_sch_get_speakers',
				schedule_post_id: $( '#post_ID' ).val()
			},
			success: function( speakers_data ) {

				// Make sure we have speakers data.
				if ( undefined === speakers_data.speakers || 'object' != typeof speakers_data.speakers || speakers_data.speakers.length == 0 ) {
					return false;
				}

				// Reset the <select>.
				$speakers_select.empty();

				// Add default/blank <option>.
				if ( $speakers_select.data( 'default' ) != '' ) {
					$speakers_select.append( '<option value="">' + $speakers_select.data( 'default' ) + '</option>' );
				}

				// Get the selected speakers.
				var selected_speakers = [];
				if ( undefined !== speakers_data.selected && speakers_data.selected.length > 0 ) {
					selected_speakers = speakers_data.selected;
				}

				// Add the options.
				$.each( speakers_data.speakers, function( index, value ) {

					// Build the speaker option.
                	var speaker_option = $( '<option value="' + value.ID + '">' + value.post_title + '</option>' );

					// Mark as selected.
					if ( $.inArray( value.ID, selected_speakers ) >= 0 ) {
						speaker_option.attr( 'selected', true );
					}

					// Add to select field.
					$speakers_select.append( speaker_option );

				});

				// Enable the select.
				$speakers_select.prop( 'disabled', false ).trigger( 'change' );

			}
		});

	}

})( jQuery );