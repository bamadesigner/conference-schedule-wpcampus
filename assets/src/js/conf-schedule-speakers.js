(function( $ ) {
	'use strict';

	// Will hold the template.
	var conf_sch_speakers_templ = false;

	// When the document is ready...
	$(document).ready(function() {

		// Get the templates.
		var conf_sch_speakers_templ_content = $( '#conf-schedule-speakers-list-template' ).html();
		if ( conf_sch_speakers_templ_content !== undefined && conf_sch_speakers_templ_content ) {

			conf_sch_speakers_templ = Handlebars.compile( conf_sch_speakers_templ_content );

			$('#conf-schedule-speakers').each(function() {
				$(this).render_conference_speakers();
			});
		}
	});

	///// FUNCTIONS /////

	$.fn.render_conference_speakers = function() {
		var $this_list = $(this), speakers_date = null, speakers_event;

		// Get date.
		if ( $this_list.data('date') != '' ) {
			speakers_date = $this_list.data('date');
		}

		// Get event.
		if ( $this_list.data('event') != '' ) {
			speakers_event = $this_list.data('event');
		}
		
		var speaker_success = false;

		// Get the schedule information.
		$.ajax({
			url: conf_sch.ajaxurl,
			type: 'GET',
			dataType: 'json',
			async: true,
			cache: false,
			data: {
				action: 'conf_sch_get_speakers',
				date: speakers_date,
				event: speakers_event
			},
			success: function( speakers ) {

				// Make sure we have speakers.
				if ( undefined === speakers || '' == speakers ) {
					return false;
				}

				speaker_success = true;
				
				$this_list.fadeOut( 500, function() {
					$this_list.hide().html( conf_sch_speakers_templ( speakers ) ).fadeIn( 500 );
				});
			},
			complete: function() {

				if ( ! speaker_success ) {
					$this_list.fadeOut( 500, function() {
						$this_list.hide().html( '<p class="conf-schedule-speakers-error">' + conf_sch.speaker_error + '</p>' ).fadeIn( 500 );
					});	
				}
			}
		});
	};

	// Format the speaker meta.
	Handlebars.registerHelper( 'speaker_sessions', function() {
		var sessions = [];

		if ( this.sessions ) {
			this.sessions.forEach(function(item) {
				var session = '';

				if ( item.title ) {
					session = item.title;
				}

				if ( item.link ) {
					session = '<a href="' + item.link + '">' + session + '</a>';
				}

				if ( session ) {
					sessions.push( session );
				}
			});
		}

		if ( ! sessions.length ) {
			return null;
		}

		var output_string = '<p class="speaker-sessions">';
		output_string += '<span class="speaker-session-label">' + ( sessions.length == 1 ? 'Session' : 'Sessions' ) + ': </span>';
		output_string += '<span class="speaker-session-events">' + sessions.join( ', ' ) + '</span>';
		output_string += '</p>';

		return new Handlebars.SafeString( output_string );
	});

	// Format the speaker meta.
	Handlebars.registerHelper( 'speaker_meta', function() {
		var output_string = '';

		if ( this.company_position || this.company ) {
			var company_position = this.company_position, company = this.company;

			if ( company_position ) {
				output_string += '<span class="speaker-position">' + company_position + '</span>';
			}

			if ( company ) {

				if ( output_string ) {
					output_string += ', ';
				}

				// Add the company URL.
				var company_website = this.company_website;
				if ( company_website ) {
					company = '<a href="' + company_website + '">' + company + '</a>';
				}

				output_string += '<span class="speaker-company">' + company + '</span>';

			}
		}
		return output_string ? new Handlebars.SafeString( '<div class="speaker-meta">' + output_string + '</div>' ) : null;
	});

	// Format the speaker social.
	Handlebars.registerHelper( 'speaker_social', function() {
		var speaker = this, social_items = [];

		var socials = ['twitter','linkedin'];
		socials.forEach( function(social_key) {

			// Build social media URL and label.
			var social_url = '';
			var social_label = speaker.hasOwnProperty( social_key ) ? speaker[social_key] : null;

			if ( social_label ) {
				switch ( social_key ) {

					case 'twitter':
						// Clean up Twitter handle.
						social_label = social_label.replace( /[^a-z0-9\_]/i, '' );
						social_url = 'https://twitter.com/' + social_label;
						social_label = '@' + social_label;
						break;

					case 'linkedin':
						social_url = social_label;
						social_label = 'LinkedIn';
						break;
				}
			}

			if ( social_label ) {
				var social_item = '<li class="social-media ' + social_key + '"><a href="' + social_url + '"><i class="conf-sch-icon conf-sch-icon-' + social_key + '"></i> <span class="icon-label">' + social_label + '</span></a></li>';
				social_items.push( social_item );
			}
		});

		return social_items.length > 0 ? new Handlebars.SafeString( '<ul class="conf-sch-event-buttons conf-sch-social-buttons">' + social_items.join('') + '</ul>' ) : null;
	});
})( jQuery );
