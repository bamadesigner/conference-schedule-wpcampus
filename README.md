# Conference Schedule

I originally created this plugin for the HighEdWeb Association regionals to display their schedule online.

You can see the plugin in action on [the HighEdWeb New England website](http://ne16.highedweb.org/schedule/), on [the WPCampus 2016 website](https://2016.wpcampus.org/schedule/), and on [the WPCampus Online website](https://online.wpcampus.org/schedule/).

## For Development

1. [Ensure node.js is installed](https://docs.npmjs.com/getting-started/installing-node) in your environment.
2. Clone the repo.
3. Open the repo in your terminal.
4. Run `npm install` to install all of the npm dependencies.
5. Run `composer install` to install all of the composer dependencies.
    * If you have any issues related to composer or PHPCS, run `composer install` again.
6. Run `gulp` to run all of your default Gulp tasks.
    * Run `gulp test` to test the plugin code for errors.
    * Run `gulp compile` to compile assets.
    * Run `gulp translate` to compile the internationalization files.
    * Run `gulp watch` to watch for file changes.