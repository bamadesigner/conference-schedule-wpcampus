const autoprefixer = require('gulp-autoprefixer');
const cleanCSS = require('gulp-clean-css');
const gulp = require('gulp');
const mergeMediaQueries = require('gulp-merge-media-queries');
const notify = require('gulp-notify');
const rename = require('gulp-rename');
const sass = require('gulp-sass');
const shell = require('gulp-shell');
const sort = require('gulp-sort');
const uglify = require('gulp-uglify');
const wp_pot = require('gulp-wp-pot');

// Define the source paths for each file type.
const src = {
	js: ['assets/js/admin-post-schedule.js','assets/js/admin-post-speakers.js','assets/js/conf-schedule.js','assets/js/conf-schedule-single.js'],
	php: ['**/*.php','!vendor/**','!node_modules/**'],
	sass: ['assets/scss/**/*.scss']
};

// Define the destination paths for each file type.
const dest = {
	js: 'assets/js',
	sass: 'assets/css',
	translate: 'languages/conf-schedule.pot'
};

// Take care of SASS.
gulp.task('sass', function() {
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
		.pipe(notify('Conference Schedule SASS compiled'));
});

// Minify the JS
gulp.task('js', function() {
	gulp.src(src.js)
		.pipe(uglify({
			mangle: false
		}))
		.pipe(rename({
			suffix: '.min'
		}))
		.pipe(gulp.dest(dest.js))
});

// "Sniff" our PHP.
gulp.task('php', function() {
	// TODO: Clean up. Want to run command and show notify for sniff errors.
	return gulp.src('conference-schedule.php', {read: false})
		.pipe(shell(['composer sniff'], {
			ignoreErrors: true,
			verbose: false
		}))
		.pipe(notify('Conference Schedule PHP sniffed'), {
			onLast: true,
			emitError: true
		});
});

// Create language files
gulp.task('translate', function () {
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
		.pipe(gulp.dest(dest.translate));
});

// Test our files.
gulp.task('test',['php']);

// Compile all the things.
gulp.task('compile',['sass','js']);

// I've got my eyes on you(r file changes).
gulp.task('watch',function() {
	gulp.watch(src.js, ['js']);
	gulp.watch(src.php, ['test','translate']);
	gulp.watch(src.sass, ['sass']);
});

// Let's get this party started.
gulp.task('default',['compile','test','translate','watch']);
