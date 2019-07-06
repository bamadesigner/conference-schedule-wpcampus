(function( $ ) {
	'use strict';

	// When the document is ready...
	$(document).ready(function() {

		// Clear the cache
		$( '#wpc-sch-clear-cache' ).on( 'click', function(e) {
			e.preventDefault();

			var proposal_id = $(this).data('proposal');

			$.ajax( {
				url: ajaxurl,
				type: 'POST',
				dataType: 'html',
				async: true,
				cache: false,
				data: {
					action: 'conf_sch_clear_proposal_cache',
					proposal_id: proposal_id
				},
				success: function( results ) {
					if ( results != '' ) {
						alert('Cache was cleared!');
					} else {
						alert('Uh-oh. The cache was not cleared. Let Rachel know if it continues.');
					}
				}
			});
		});

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
				minTime: '5:00 am'
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

		// Setup the fields.
		var $locations = $( '#conf-sch-location' );
		var $event_parent = $( '#conf-sch-event-parent' );

		// Setup the select2 fields.
		$locations.select2();

		// Populate the events and refresh when you click.
		$event_parent.conf_sch_populate_group_events();
		$( '.conf-sch-refresh-events' ).on( 'click', function( $event ) {
			$event.preventDefault();
			$event_parent.conf_sch_populate_group_events();
			return false;
		});

		// Populate the locations and refresh when you click.
		$locations.conf_sch_populate_locations();
		$( '.conf-sch-refresh-locations' ).on( 'click', function( $event ) {
			$event.preventDefault();
			$locations.conf_sch_populate_locations();
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

	// Populate a terms <select>.
	$.fn.conf_sch_populate_terms = function( $taxonomy ) {

		// Make sure we have a defined taxonomy.
		if ( undefined === $taxonomy || $taxonomy == '' ) {
			return;
		}

		// Set the <select> and disable.
		var $terms_select = $( this ).prop( 'disabled', 'disabled' );

		// Get the terms information.
		$.ajax( {
			url: ajaxurl,
			type: 'GET',
			dataType: 'json',
			async: true,
			cache: false,
			data: {
				action: 'conf_sch_get_terms',
				post_id: conf_sch.post_id,
				taxonomy: $taxonomy
			},
			success: function( $terms ) {

				// Make sure we have terms.
				if ( undefined === $terms || '' == $terms ) {
					return false;
				}

				// Reset the <select>.
				$terms_select.empty();

				// Add default/blank <option>.
				if ( $terms_select.data( 'default' ) != '' ) {
					$terms_select.append( '<option value="">' + $terms_select.data( 'default' ) + '</option>' );
				}

				// Add the options.
				$.each( $terms, function( index, value ) {
					var $term = $( '<option value="' + value.term_id + '">' + value.name + '</option>' );
					if ( value.is_selected ) {
						$term.attr( 'selected', true ).trigger( 'change' );
					}
					$terms_select.append( $term );
				});

				// Enable the select.
				$terms_select.prop( 'disabled', false ).trigger( 'change' );

			}
		});
	};

	// Populate the event.
	$.fn.conf_sch_populate_group_events = function() {

		// Set the <select> field and disable.
		var $select_field = $( this ).prop( 'disabled', 'disabled' );

		// Get the events information.
		$.ajax( {
			url: ajaxurl,
			type: 'GET',
			dataType: 'json',
			async: true,
			cache: false,
			data: {
				action: 'conf_sch_get_group_events',
				select_parent: conf_sch.post_id
			},
			success: function( posts ) {

				// Populate the posts.
				$select_field.conf_sch_populate_posts( posts, conf_sch.post_id );

				// Enable the select.
				$select_field.prop( 'disabled', false ).trigger( 'change' );

			}
		});
	};

	/**
	 * Populate a <select> with location information.
	 *
	 * Needs to be invoked by a <select> field.
	 */
	$.fn.conf_sch_populate_locations = function() {

		// Set the <select> and disable.
		var $select_field = $( this ).prop( 'disabled', 'disabled' );

		// Get the location information.
		$.ajax( {
			url: ajaxurl,
			type: 'GET',
			dataType: 'json',
			async: true,
			cache: false,
			data: {
				action: 'conf_sch_get_posts',
				post_id: conf_sch.post_id,
				post_type: 'locations',
				meta_key: 'conf_sch_event_location'
			},
			success: function( posts ) {

				// Populate the posts.
				$select_field.conf_sch_populate_posts( posts );

				// Enable the select.
				$select_field.prop( 'disabled', false ).trigger( 'change' );

			}
		});
	};

	/**
	 * Populate a <select> with post information.
	 *
	 * Needs to be invoked by a <select> field.
	 */
	$.fn.conf_sch_populate_posts = function( posts, exclude_post ) {

		/*
		 * Default of exclude_post is 0
		 * if no post ID is passed.
		 */
		if ( undefined === exclude_post || ! $.isNumeric( exclude_post ) ) {
			exclude_post = 0;
		} else {
			exclude_post = parseInt( exclude_post );
		}

		// Set the <select> and disable.
		var $select_field = $( this );

		// Reset the <select>.
		$select_field.empty();

		// Add default/blank <option>.
		if ( $select_field.data( 'default' ) != '' ) {
			$select_field.append( '<option value="">' + $select_field.data( 'default' ) + '</option>' );
		}

		// Make sure we have posts.
		if ( undefined === posts || '' == posts ) {
			return;
		}

		// Add the options.
		$.each( posts, function( index, value ) {

			// Don't include current post.
			if ( exclude_post > 0 && exclude_post == value.ID ) {
				return;
			}

			// Build post field.
			var $post = $( '<option value="' + value.ID + '">' + value.post_title + '</option>' );

			// Mark selected post.
			if ( value.is_selected ) {
				$post.attr( 'selected', true ).trigger( 'change' );
			}

			// Add post field.
			$select_field.append( $post );

		});
	};
})( jQuery );