(function( $ ) {
	'use strict';

	// Will hold the template.
	var conf_sch_list_templ = false;

	// When the document is ready...
	$(document).ready(function() {

		// Get the templates.
		var conf_sch_list_templ_content = $( '#conf-schedule-events-list-template' ).html();
		if ( conf_sch_list_templ_content !== undefined && conf_sch_list_templ_content ) {

			conf_sch_list_templ = Handlebars.compile( conf_sch_list_templ_content );

			$('.conf-schedule-events-list').each(function() {
				$(this).render_conference_schedule_list();
			});
		}
	});

	///// FUNCTIONS /////

	// Get/update the schedule.
	$.fn.render_conference_schedule_list = function() {
		var $this_list = $(this);

		// Build the URL.
		var apiURL = conf_sch.wp_api_route + 'schedule',
			apiURLArgs = '';

		// Add date.
		if ( $this_list.data('date') ) {
			apiURLArgs += 'conf_sch_event_date=' +  $this_list.data('date');
		}

		if ( $this_list.data('orderby') ) {
			if ( apiURLArgs ) {
        		apiURLArgs += '&';
        	}
			apiURLArgs += 'conf_sch_event_orderby=' +  $this_list.data('orderby');
		}

		if ( $this_list.data('order') ) {
			if ( apiURLArgs ) {
				apiURLArgs += '&';
			}
			apiURLArgs += 'conf_sch_event_order=' +  $this_list.data('order');
		}

		var schedule_items = [], proposals = {};

		if ( apiURLArgs ) {
			apiURL += '?' + apiURLArgs;
		}

		// Get the schedule information.
		$.ajax({
			url: apiURL,
			success: function( the_schedule_items ) {

				// Make sure we have items.
				if ( undefined === the_schedule_items || '' == the_schedule_items ) {
					return false;
				}

				// Store the schedule items.
				schedule_items = the_schedule_items;

				// Get the proposals.
				$.ajax( {
					url: conf_sch.ajaxurl,
					type: 'GET',
					dataType: 'json',
					async: false,
					cache: false,
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
							if ( proposal.ID && 'confirmed' == proposal.proposal_status ) {
								proposals['proposal'+proposal.ID] = proposal;
							}
						});

					}
				});
			},
			complete: function() {

				// Make sure we have schedule items.
				if ( ! schedule_items ) {
					return false;
				}

				// Build the HTML.
				var schedule_html = '';

				// Go through each item.
				$.each( schedule_items, function( index, item ) {

					// If this event is a child, don't add.
					/*if ( item.parent > 0 ) {
						return true;
					}*/

					// If we're a session, make sure we have a proposal.
					var proposal = null;
					if ( 'session' == item.event_type ) {

						if ( item.proposal > 0 && ( 'proposal' + item.proposal ) in proposals ) {
							proposal = proposals['proposal' + item.proposal];
						}

						if ( ! proposal ) {
							return true;
						}

						// Update proposal information.
						if ( proposal.title ) {
							item.title = proposal.title;
							item.excerpt = proposal.excerpt;
							item.format_name = proposal.format_name;
							item.speakers = proposal.speakers;
							item.subjects = proposal.subjects;
						}
					}

					// Render the templates.
					schedule_html += conf_sch_list_templ(item);

				});

				$this_list.html(schedule_html);

				$this_list.removeClass( 'loading' );

			}
		});
	};
})(jQuery);