// Format the speaker social media
Handlebars.registerHelper( 'speaker_social', function() {
	var social_media_string = '';

	if ( this.facebook !== undefined && this.facebook ) {
		social_media_string += '<li class="event-link event-social event-facebook"><a href="' + this.facebook + '"><i class="conf-sch-icon conf-sch-icon-facebook-square"></i> <span class="icon-label">Facebook</span></a></li>';
	}

	if ( this.twitter !== undefined && this.twitter ) {
		var twitterHandle = this.twitter.replace( /[^a-z0-9\_]/i, '' );
		social_media_string += '<li class="event-link event-social event-twitter"><a href="https://twitter.com/' + twitterHandle + '"><i class="conf-sch-icon conf-sch-icon-twitter"></i> <span class="icon-label">@' + twitterHandle + '</span></a></li>';
	}

	if ( this.instagram !== undefined && this.instagram ) {
		social_media_string += '<li class="event-link event-social event-instagram"><a href="https://www.instagram.com/' + this.instagram + '"><i class="conf-sch-icon conf-sch-icon-instagram"></i> <span class="icon-label">Instagram</span></a></li>';
	}

	if ( this.linkedin !== undefined && this.linkedin ) {
		social_media_string += '<li class="event-link event-social event-linkedin"><a href="' + this.linkedin + '"><i class="conf-sch-icon conf-sch-icon-linkedin-square"></i> <span class="icon-label">LinkedIn</span></a></li>';
	}

	if ( social_media_string ) {
		return new Handlebars.SafeString( '<ul class="conf-sch-event-buttons">' + social_media_string + '</ul>' );
	}

	return null;
});

Handlebars.registerHelper( 'event_links_list', function(options) {

	if (!this.event_links){
		return '';
	}

	// Build the string.
	var event_links_string = '';

	for (var key in this.event_links) {

		if (!this.event_links.hasOwnProperty(key)) {
			continue;
		}

		var value = this.event_links[key];
		if (!value) {
			continue;
		}

		switch(key) {

			case 'captions':
				if ( conf_sch.view_captions !== undefined && conf_sch.view_captions != '' ){
					event_links_string += conf_sch_get_event_link(key,value,conf_sch.view_captions,'captions');
				}
				break;

			case 'livestream':
				if ( conf_sch.view_livestream !== undefined && conf_sch.view_livestream != ''){
					event_links_string += conf_sch_get_event_link(key,value,conf_sch.view_livestream,'video');
				}
				break;

			case 'video':
				if ( conf_sch.watch_video !== undefined && conf_sch.watch_video != '' ) {
					event_links_string += conf_sch_get_event_link(key,value,conf_sch.watch_video,'video');
				}
				break;

			case 'feedback':
				if ( conf_sch.give_feedback !== undefined && conf_sch.give_feedback != '' ) {
					event_links_string += conf_sch_get_event_link(key,value,conf_sch.give_feedback,'thumbs-up');
				}
				break;

			case 'slides':
				if ( conf_sch.view_slides !== undefined && conf_sch.view_slides != '' ) {

					event_links_string += conf_sch_get_event_link(key,value,conf_sch.view_slides,'slides');
				}
				break;

			case 'twitter':
				event_links_string += conf_sch_get_twitter_event_link_strings(this);
				break;

			case 'schedule':
				event_links_string += conf_sch_get_event_link(key,value,conf_sch.view_schedule,'calendar');
				break;

			/*case 'hashtag':
				if ( this.event_hashtag !== undefined && this.event_hashtag ) {
					event_links_string += conf_sch_get_event_link('twitter','https://twitter.com/search?q=%23' + value,'<i class="conf-sch-icon conf-sch-icon-twitter"></i> <span class="icon-label">#' + value + '</span>');
				}
				break;*/

		}
	}

	if ( event_links_string ) {
		return new Handlebars.SafeString( '<ul class="conf-sch-event-buttons">' + event_links_string + '</ul>' );
	}

	return null;
});

Handlebars.registerHelper( 'schedule_header', function() {
	if ( 'h3' == this.header ) {
		return new Handlebars.SafeString( '<h3 class="schedule-header">' + this.day_display + '</h3>' );
	}
	return new Handlebars.SafeString( '<h2 class="schedule-header">' + this.day_display + '</h2>' );
});

Handlebars.registerHelper( 'event_date_display', function() {

	if ( ! this.displayDate && this.event_dt_gmt ) {
		this.displayDate = conf_sch_get_utc_date( this.event_dt_gmt );
	}

	if ( ! this.displayDate ) {
		return new Handlebars.SafeString( '<em>TBA</em>' );
	}

	var display = conf_sch_get_weekday( this.displayDate ) + ', ' + conf_sch_get_month( this.displayDate ) + ' ' + this.displayDate.getDate() + ', ' + this.displayDate.getFullYear();

	return new Handlebars.SafeString( display );
});

Handlebars.registerHelper( 'event_time_display', function() {

	if ( ! this.displayDate && this.event_dt_gmt ) {
		this.displayDate = conf_sch_get_utc_date( this.event_dt_gmt );
	}

	if ( ! this.displayDate ) {
		return new Handlebars.SafeString( '<em>TBA</em>' );
	}

	if ( ! this.displayEndDate && this.event_end_dt_gmt ) {
		this.displayEndDate = conf_sch_get_utc_date( this.event_end_dt_gmt );
	}

	return conf_sch_get_event_time_display( this.displayDate, this.displayEndDate );
});

Handlebars.registerHelper( 'event_time_display_offset', function() {

	if ( ! this.displayDate && this.event_dt_gmt ) {
		this.displayDate = conf_sch_get_utc_date( this.event_dt_gmt );
	}

	if ( ! this.displayDate ) {
		return null;
	}

	if ( this.displayOffset !== 0 ) {
		this.displayDate = conf_sch_adjust_date_offset( this.displayDate, this.displayOffset );
	}

	if ( ! this.displayEndDate && this.event_end_dt_gmt ) {
		this.displayEndDate = conf_sch_get_utc_date( this.event_end_dt_gmt );

		if ( this.displayOffset !== 0 ) {
			this.displayEndDate = conf_sch_adjust_date_offset( this.displayEndDate, this.displayOffset );
		}
	}

	return conf_sch_get_event_time_display( this.displayDate, this.displayEndDate );
});

Handlebars.registerHelper( 'event_time_display_tz', function() {

	if ( ! this.displayDate && this.event_dt_gmt ) {
		this.displayDate = conf_sch_get_utc_date( this.event_dt_gmt );
	}

	if ( ! this.displayDate ) {
		return new Handlebars.SafeString( '<em>TBA</em>' );
	}

	if ( ! this.displayEndDate && this.event_end_dt_gmt ) {
		this.displayEndDate = conf_sch_get_utc_date( this.event_end_dt_gmt );
	}

	var display = conf_sch_get_event_time_display( this.displayDate, this.displayEndDate ),
		offset = ( 0 - this.displayDate.getTimezoneOffset() ),
	 	short = conf_schedule_get_timezone_data( offset ),
		offsetMessage = conf_sch_get_offset_message( offset );

	if ( short ) {
		display += ' ' + short;
	} else {
		display += ' (' + offsetMessage + ')';
	}

	return new Handlebars.SafeString( display );
});
