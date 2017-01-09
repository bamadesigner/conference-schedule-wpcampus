// Require all the things (that we need)
var autoprefixer = require('gulp-autoprefixer');
var gulp = require('gulp');
var phpcs = require('gulp-phpcs');
var rename = require('gulp-rename');
var sass = require('gulp-sass');
var sort = require('gulp-sort');
var uglify = require('gulp-uglify');
var watch = require('gulp-watch');
var wpPot = require('gulp-wp-pot');

// Define the source paths for each file type
var src = {
    scss: 'assets/scss/*.scss',
    js: ['assets/js/*.js','!assets/js/*.min.js','!assets/js/*-min.js'],
    php: ['**/*.php','!vendor/**','!node_modules/**']
};

// Define the destination paths for each file type
var dest = {
	scss: './assets/css',
	js: './assets/js'
}

// I've got my eyes on you(r file changes)
gulp.task('watch', function() {
	gulp.watch(src.scss, ['sass']);
	gulp.watch(src.js, ['js']);
});

// Sass is pretty awesome, right?
gulp.task('sass', function() {
	return gulp.src(src.scss)
		.pipe(sass({
			outputStyle: 'compressed'
		})
		.on('error', sass.logError))
		.pipe(autoprefixer({
			browsers: ['last 2 versions'],
			cascade: false
		}))
		.pipe(rename({ suffix: '.min' }))
		.pipe(gulp.dest(dest.scss));
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

// Check our PHP
gulp.task('php',function() {
	gulp.src(src.php)
		.pipe(phpcs({
			bin: 'vendor/bin/phpcs',
			standard: 'WordPress-Core'
		}))
		.pipe(phpcs.reporter('log'));
});

// Create language files
gulp.task('translate', function () {
    return gulp.src(src.php)
    	.pipe(sort())
        .pipe(wpPot( {
            domain: 'conf-schedule',
            destFile: 'conf-schedule.pot',
            package: 'Conference_Schedule',
            bugReport: 'https://github.com/bamadesigner/conference-schedule/issues',
            lastTranslator: 'Rachel Carden <bamadesigner@gmail.com>',
            team: 'Rachel Carden <bamadesigner@gmail.com>',
            headers: false
        } ))
        .pipe(gulp.dest('languages/conf-schedule.pot'));
});

// Let's get this party started
gulp.task('default', ['compile','translate']);
gulp.task('compile', ['sass','js']);
gulp.task('test', ['php']);