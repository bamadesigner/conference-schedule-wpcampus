var startTime, endTime;

function conf_sch_get_weekday( date ) {
	var dayNames = [
		'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
	];
	return dayNames[date.getDay()];
}

function conf_sch_get_month( date ) {
	var monthNames = [
		'January', 'February', 'March',
		'April', 'May', 'June', 'July',
		'August', 'September', 'October',
		'November', 'December'
	];
	return monthNames[date.getMonth()];
}

function conf_sch_get_timezone_offset( date ) {
	if ( ! date ) {
		var date = conf_sch_get_current_date();
	}

	var offsetMinutes = parseInt( date.getTimezoneOffset() );

	if ( offsetMinutes > 0 ) {
		offsetMinutes = 0 - offsetMinutes;
	} else {
		offsetMinutes = Math.abs( offsetMinutes );
	}

	return offsetMinutes;
}

function conf_sch_split_dt_string( dtString ) {
	return dtString.split(/\D/);
}

/**
 * Is used all over the project and lets us change the "current"
 * time globally, which comes in handy for testing.
 */
function conf_sch_get_current_date() {
	// @TODO reset?
	//return new Date( '2019-07-26:11:32:00' );
	return new Date();
}

// Accepts Date() object. Returns Date() object.
function conf_sch_get_date_utc( date_time ) {
	if ( ! date_time ) {
		date_time = conf_sch_get_current_date();
	}
	return new Date( Date.UTC( date_time.getUTCFullYear(), date_time.getUTCMonth(), date_time.getUTCDate(), date_time.getUTCHours(), date_time.getUTCMinutes(), date_time.getUTCSeconds() ) );
}

/* @TODO Moves the time in the wrong direction? */
function conf_sch_get_utc_date( dtString ) {
	var b = conf_sch_split_dt_string( dtString );
	return new Date( Date.UTC( b[0],b[1]-1,b[2],b[3],b[4],b[5] ) );
}

function conf_sch_get_event_time_display( startDT, endDT ) {
	var startTime = conf_sch_get_time_display( startDT ),
		startPM = ( startDT.getHours() >= 12 ),
		endtime = endDT ? conf_sch_get_time_display( endDT ) : null,
		endPM = endDT ? ( endDT.getHours() >= 12 ) : null,
		display = startTime;

	if ( startPM != endPM ) {
		if ( startPM ) {
			display += ' p.m.';
		} else {
			display += ' a.m.';
		}
	}

	if ( endtime ) {

		display += ' - ' + endtime;

		if ( endPM ) {
			display += ' p.m.';
		} else {
			display += ' a.m.';
		}
	}

	return display;
}

function conf_sch_adjust_date_offset( date, offset ) {
	if ( 0 == offset ) {
		return date;
	}
	var abs = offset > 0,
		offset = Math.abs( offset ),
		minutes = offset % 60,
		hours = offset - minutes;

	// Adjust hours.
	if ( hours > 0 ) {
		hours = hours / 60;
		if ( ! abs ) {
			hours = 0 - hours;
		}
		date.setHours( date.getHours() + hours );
	}

	// Adjust minutes.
	if ( minutes > 0 ) {
		if ( ! abs ) {
			minutes = 0 - minutes;
		}
		date.setMinutes( date.getMinutes() + minutes );
	}

	return date;
}

function conf_sch_get_time_display( date ) {
	var hours = date.getHours(),
		minutes = date.getMinutes();
	if ( minutes < 10 ) {
		minutes = '0' + minutes;
	}
	if ( hours > 12 ) {
		hours -= 12;
	}
	return hours + ':' + minutes;
}

Date.prototype.stdTimezoneOffset = function () {
	var jan = new Date( this.getFullYear(), 0, 1 );
	var jul = new Date( this.getFullYear(), 6, 1 );
	return Math.max( jan.getTimezoneOffset(), jul.getTimezoneOffset() );
}

Date.prototype.isDstObserved = function () {
	return this.getTimezoneOffset() < this.stdTimezoneOffset();
}

function conf_sch_get_offset_message( offset ) {
	var offsetHours = offset / 60,
		offsetMessage = 'UTC';

	if ( offsetHours >= 0 ) {
		offsetMessage += '+' + Math.floor( offsetHours );
	} else {
		offsetMessage += Math.floor( offsetHours );
	}

	var offsetDecimal = Math.abs( offsetHours % 1 );
	if ( offsetDecimal == 0 ) {
		offsetMessage += ':00';
	} else {
		offsetMessage += ':' + ( offsetDecimal * 60 );
	}

	return offsetMessage;
}

function conf_schedule_get_timezone_data( tzOffset ) {
	const timezones = conf_schedule_get_timezones();
	var short = '';
	timezones.forEach(function( value, index ) {
		if ( short || tzOffset !== value.offset || ! value.short ) {
			return false;
		}
		short = value.short;
	});
	return short;
}

function conf_schedule_get_timezones() {
	var date = conf_sch_get_current_date();
	if ( date.isDstObserved ) {
		return [
			{
				offset: -720
			},
			{
				offset: -660
			},
			{
				offset: -570,
				label: 'Hawaii Time'
			},
			{
				offset: -540,
				label: 'French Polynesia'
			},
			{
				offset: -480,
				label: 'Alaska Time'
			},
			{
				offset: -420,
				label: 'Pacific Time',
				short: 'PST'
			},
			{
				offset: -360,
				label: 'Mountain Time',
				short: 'MST'
			},
			{
				offset: -300,
				label: 'Central Time',
				short: 'CST'
			},
			{
				offset: -240,
				label: 'Eastern Time',
				short: 'EST'
			},
			{
				offset: -210,
				label: 'Atlantic Time'
			},
			{
				offset: -180,
				label: 'Newfoundland Time Zone'
			},
			{
				offset: -120
			},
			{
				offset: -60
			},
			{
				offset: 0
			},
			{
				offset: 60
			},
			{
				offset: 120
			},
			{
				offset: 180
			},
			{
				offset: 210
			},
			{
				offset: 240
			},
			{
				offset: 270
			},
			{
				offset: 300
			},
			{
				offset: 330
			},
			{
				offset: 345
			},
			{
				offset: 360
			},
			{
				offset: 390
			},
			{
				offset: 420
			},
			{
				offset: 480
			},
			{
				offset: 525
			},
			{
				offset: 540
			},
			{
				offset: 570
			},
			{
				offset: 600
			},
			{
				offset: 630
			},
			{
				offset: 660
			},
			{
				offset: 720
			},
			{
				offset: 765
			},
			{
				offset: 780
			},
			{
				offset: 840
			}
		];
	}
	return [
		{
			offset: -720
		},
		{
			offset: -660
		},
		{
			offset: -600,
			label: 'Hawaii Time'
		},
		{
			offset: -570,
			label: 'French Polynesia'
		},
		{
			offset: -540,
			label: 'Alaska Time'
		},
		{
			offset: -480,
			label: 'Pacific Time',
			short: 'PST'
		},
		{
			offset: -420,
			label: 'Mountain Time',
			short: 'MST'
		},
		{
			offset: -360,
			label: 'Central Time',
			short: 'CST'
		},
		{
			offset: -300,
			label: 'Eastern Time',
			short: 'EST'
		},
		{
			offset: -240,
			label: 'Atlantic Time'
		},
		{
			offset: -210,
			label: 'Newfoundland Time Zone'
		},
		{
			offset: -180
		},
		{
			offset: -120
		},
		{
			offset: -60
		},
		{
			offset: 0
		},
		{
			offset: 60
		},
		{
			offset: 120
		},
		{
			offset: 180
		},
		{
			offset: 210
		},
		{
			offset: 240
		},
		{
			offset: 270
		},
		{
			offset: 300
		},
		{
			offset: 330
		},
		{
			offset: 345
		},
		{
			offset: 360
		},
		{
			offset: 390
		},
		{
			offset: 420
		},
		{
			offset: 480
		},
		{
			offset: 525
		},
		{
			offset: 540
		},
		{
			offset: 570
		},
		{
			offset: 600
		},
		{
			offset: 630
		},
		{
			offset: 660
		},
		{
			offset: 720
		},
		{
			offset: 765
		},
		{
			offset: 780
		},
		{
			offset: 840
		}
	];
}

function conf_sch_start_tracking() {
	startTime = new Date();
}

function conf_sch_end_tracking() {
	var endTime = new Date(),
		timeDiff = endTime - startTime; //in ms
	// Strip the ms
	timeDiff /= 1000;
  	var seconds = Math.round(timeDiff);
}

function conf_schedule_reset_schedule_item(item){
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

	return item;
}

function conf_schedule_update_schedule_item_from_proposal(item,proposal){

	item.valid_session = true;

	if ( proposal.title ) {
		item.title.rendered = proposal.title;
	}

	item.content = proposal.content || {};
	item.excerpt = proposal.excerpt || {};

	item.speakers = proposal.speakers || [];
	item.subjects = proposal.subjects || [];
	item.format_slug = proposal.format_slug;
	item.format_name = proposal.format_name;

	item.session_video_id = proposal.session_video_id;
	item.session_video_embed = proposal.session_video_embed;

	if ( '' != proposal.session_video_url && item.link ) {
		item.session_video_url = item.link + '#video';
	}

	item.session_slides_url = proposal.session_slides_url;

	return item;
}

function conf_sch_get_event_link(key,href,label,icon) {
	var iconStart = '', iconEnd = '';
	if (undefined !== icon) {
		iconStart = '<i aria-hidden="true" class="conf-sch-icon conf-sch-icon-' + icon +'"></i> <span class="icon-label">';
		iconEnd = '</span>';
	}
	return '<li class="event-link event-' + key + '"><a href="' + href + '">' + iconStart + label + iconEnd + '</a></li>';
}

function conf_sch_get_twitter_event_link_strings(item) {
	if (!item.event_links || !item.event_links.twitter || !item.event_links.twitter.length) {
		return '';
	}

	var link_strings = '';

	for (var i = 0; i < item.event_links.twitter.length; i++) {
		var value = item.event_links.twitter[i];
		link_strings += '<li class="event-link event-social event-twitter"><a href="https://twitter.com/' + value + '"><i class="conf-sch-icon conf-sch-icon-twitter"></i> <span class="icon-label">@' + value + '</span></a></li>';
	}

	return link_strings;
}

function conf_sch_get_item_links(item) {

	// Build object of links.
	var links = {}, linksCount = 0;

	// Do we have a livestream URL and is it enabled?
	if (undefined !== item.session_livestream_url && item.session_livestream_url) {
		links.captions = item.session_captions_url;
		links.livestream = item.session_livestream_url;
		linksCount++;
		linksCount++;
	}

	// Do we have a video URL?
	if (undefined !== item.session_video_url && item.session_video_url) {
		links.video = item.session_video_url;
		linksCount++;
	}

	// Do we have a feedback URL?
	if (undefined !== item.session_feedback_url && item.session_feedback_url ) {
		links.feedback = item.session_feedback_url;
		linksCount++;
	}

	// Do we have a slides URL and is it enabled?
	if (undefined !== item.session_slides_url && item.session_slides_url ) {
		links.slides = item.session_slides_url;
		linksCount++;
	}

	// Do we have speaker twitters?
	var twitters = [];
	if (undefined !== item.speakers && item.speakers && item.speakers.length > 0 ) {
		for (var i = 0; i < item.speakers.length; i++) {
			var value = item.speakers[i];
			if (undefined !== value.twitter && value.twitter) {
				twitters.push(value.twitter);
			}
		}
	}
	if (twitters.length) {
		links.twitter = twitters;
		linksCount++;
	}

	// Is discussion enabled?
	if (false !== item.discussion && null !== item.discussion && item.discussion >= 0 ) {
		links.discussion = '#discussion';
		linksCount++;
	}

	// Do we have an event hashtag?
	/*if (undefined !== item.event_hashtag && item.event_hashtag) {
		links.hashtag = item.event_hashtag;
	}*/

	return linksCount > 0 ? links : null;
}
