const autoprefixer = require('gulp-autoprefixer');
const cleanCSS = require('gulp-clean-css');
const gulp = require('gulp');
const mergeMediaQueries = require('gulp-merge-media-queries');
const notify = require('gulp-notify');
const rename = require('gulp-rename');
const sass = require('gulp-sass');
const shell = require('gulp-shell');
const sort = require('gulp-sort');
const minify = require('gulp-minify');
const wp_pot = require('gulp-wp-pot');

// Define the source paths for each file type.
const src = {
	js: [
		'assets/src/js/admin-post-schedule.js',
		'assets/src/js/conf-schedule.js',
		'assets/src/js/conf-schedule-list.js',
		'assets/src/js/conf-schedule-speakers.js',
		'assets/src/js/conf-schedule-single.js'
	],
	php: ['**/*.php','!vendor/**','!node_modules/**'],
	sass: ['assets/src/scss/**/*.scss']
};

// Define the destination paths for each file type.
const dest = {
	js: 'assets/build/js',
	sass: 'assets/build/css',
	translate: 'languages/conf-schedule.pot'
};

// Take care of SASS.
gulp.task('sass', function(done) {
	return gulp.src(src.sass)
		.pipe(sass({
			outputStyle: 'compressed'
		}).on('error', sass.logError))
		.pipe(mergeMediaQueries())
		.pipe(autoprefixer({
			browsers: ['last 2 versions'],
			cascade: false
		}))
		.pipe(cleanCSS({
			compatibility: 'ie8'
		}))
		.pipe(rename({
			suffix: '.min'
		}))
		.pipe(gulp.dest(dest.sass))
		.pipe(notify('Conference Schedule SASS compiled'))
		.on('end',done);
});

// Minify the JS.
gulp.task('js', function(done) {
	gulp.src(src.js)
		.pipe(minify({
			mangle: false,
			noSource: true,
			ext:{
				min:'.min.js'
			}
		}))
		.pipe(gulp.dest(dest.js))
		.pipe(notify('Conference Schedule JS compiled'));

	// Move our third-party scripts.
	gulp.src([
		'assets/src/js/select2.min.js',
		'assets/src/js/timepicker.min.js'
	]).pipe(gulp.dest(dest.js))
	.on('end',done);
});

// "Sniff" our PHP.
gulp.task('php', function(done) {
	// TODO: Clean up. Want to run command and show notify for sniff errors.
	return gulp.src('conference-schedule.php', {read: false})
		.pipe(shell(['composer sniff'], {
			ignoreErrors: true,
			verbose: false
		}))
		.pipe(notify('Conference Schedule PHP sniffed'), {
			onLast: true,
			emitError: true
		})
		.on('end',done);
});

// Create language files
gulp.task('translate', function (done) {
	return gulp.src(src.php)
		.pipe(sort())
		.pipe(wp_pot({
			domain: 'conf-schedule',
			destFile: 'conf-schedule.pot',
			package: 'Conference_Schedule',
			bugReport: 'https://github.com/wpcampus/conference-schedule/issues',
			lastTranslator: 'WPCampus <code@wpcampus.org>',
			team: 'WPCampus <code@wpcampus.org>',
			headers: false
		}))
		.pipe(gulp.dest(dest.translate))
		.on('end',done);
});

// Test our files.
gulp.task('test',gulp.series('php'));

// Compile all the things.
gulp.task('compile',gulp.series('sass','js'));

// Let's get this party started.
gulp.task('default', gulp.series('compile','test','translate'));

// I've got my eyes on you(r file changes).
gulp.task('watch', gulp.series('default',function(done) {
	gulp.watch(src.js, gulp.series('js'));
	gulp.watch(src.php,gulp.series('test','translate'));
	gulp.watch(src.sass,gulp.series('sass'));
	return done();
}));
