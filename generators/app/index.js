'use strict';
var yeoman = require('yeoman-generator');
var chalk = require('chalk');
var yosay = require('yosay');
var stripJsonComments = require('strip-json-comments');

module.exports = yeoman.Base.extend({
  constructor: function (args, options) {
    options.force = true;
    yeoman.Base.call(this, args, options);
  },

  initializing: function () {
    this.log(yosay(
      'Welcome to the awesome ' + chalk.blue('SPCAF') + ' generator!'
    ));

    if (!this.fs.exists(this.destinationPath('gulpfile.js'))) {
      this.log(chalk.red('ERROR: ') + 'File \'gulpfile.js\' not found. Please check that you are running this generator in the root of your SharePoint Framework project and try again.');
    }
  },

  prompting: function () {
    var prompts = [{
      type: 'input',
      name: 'spcafPath',
      message: 'Where do you have SPCAF installed?',
      default: 'C:\\Program Files (x86)\\SPCAF'
    }];

    return this.prompt(prompts).then(function (props) {
      this.props = props;
    }.bind(this));
  },

  writing: {
    backupFiles: function () {
      var now = new Date().toISOString().replace('T', '').replace('Z', '').replace(/-/g, '').replace(/:/g, '').replace('.', '');
      if (this.fs.exists(this.destinationPath('package.json'))) {
        this.fs.copy(this.destinationPath('package.json'), this.destinationPath('package.json.bak_' + now));
      }
      if (this.fs.exists(this.destinationPath('gulpfile.js'))) {
        this.fs.copy(this.destinationPath('gulpfile.js'), this.destinationPath('gulpfile.js.bak_' + now));
      }
      if (this.fs.exists(this.destinationPath('.vscode/tasks.json'))) {
        this.fs.copy(this.destinationPath('.vscode/tasks.json'), this.destinationPath('.vscode/tasks.json.bak_' + now));
      }
      if (this.fs.exists(this.destinationPath('SharePointFramework.spruleset'))) {
        this.fs.copy(this.destinationPath('SharePointFramework.spruleset'), this.destinationPath('SharePointFramework.spruleset.bak_' + now));
      }
    },

    upsertPackageJson: function () {
      this.log(chalk.yellow('Verifying package.json dependencies...'));

      var packageJson = this.fs.readJSON(this.destinationPath('package.json'));
      var isChanged = false;

      if (!packageJson.devDependencies) {
        packageJson.devDependencies = {};
        isChanged = true;
      }

      if (!packageJson.devDependencies['chalk']) {
        packageJson.devDependencies['chalk'] = '^1.1.3';
        isChanged = true;
      }

      if (!packageJson.devDependencies['yargs']) {
        packageJson.devDependencies['yargs'] = '^4.6.0';
        isChanged = true;
      }

      if (isChanged) {
        this.log(chalk.yellow('Writing updated dependencies to package.json'));
        this.fs.writeJSON(this.destinationPath('package.json'), packageJson);
      }
      else {
        this.log(chalk.yellow('package.json already up to date'));
      }
    },

    upsertGulpfileJs: function () {
      this.log(chalk.yellow('Installing the SPCAF Gulp task...'));

      var gulpFile = this.fs.read(this.destinationPath('gulpfile.js'));
      if (gulpFile.indexOf('gulp.task(\'spcaf\',') > -1) {
        this.log(chalk.yellow('SPCAF Gulp task already present. No need to install.'));
        return;
      }

      var breakpoint = 'const build = require(\'@microsoft/sp-build-web\');\r\n';
      if (gulpFile.indexOf(breakpoint) === -1) {
        breakpoint = breakpoint.substr(0, breakpoint.length - 2) + '\n';
      }

      var pos = gulpFile.indexOf(breakpoint) + breakpoint.length;
      gulpFile = gulpFile.substr(0, pos) + "const spawn = require('child_process').spawn;\r\n\
const chalk = require('chalk');\r\n\
const argv = require('yargs').argv;\r\n" + gulpFile.substr(pos);

      var spcafGulpTask = this.fs.read(this.templatePath('gulpfile-spcaf-task.js'));
      gulpFile += '\r\n' + spcafGulpTask;

      gulpFile = gulpFile.replace('<%= spcafpath %>', this.props.spcafPath.replace(/\\/g, '\\\\'));

      this.log(chalk.yellow('Writing updated gulpfile.js'));
      this.fs.write(this.destinationPath('gulpfile.js'), gulpFile);
    },

    upsertTasksJson: function () {
      this.log(chalk.yellow('Integrating the SPCAF Gulp task with VSCode...'));

      if (!this.fs.exists(this.destinationPath('.vscode/tasks.json'))) {
        this.log(chalk.yellow('.vscode/tasks.json not found. Copying...'));

        this.fs.copy(
          this.templatePath('vscode-tasks.json'),
          this.destinationPath('.vscode/tasks.json')
        );

        return;
      }

      this.log(chalk.yellow('.vscode/tasks.json found. Checking if the SPCAF task already exists...'));

      var tasksJsonRaw = this.fs.read(this.destinationPath('.vscode/tasks.json'), 'utf8');
      var tasksJson = JSON.parse(stripJsonComments(tasksJsonRaw));
      var spcafTaskExists = false;
      if (tasksJson.tasks != null) {
        for (var i = 0; i < tasksJson.tasks.length; i++) {
          if (tasksJson.tasks[i].taskName === 'spcaf') {
            spcafTaskExists = true;
            break;
          }
        }
      }

      if (spcafTaskExists) {
        this.log(chalk.yellow('SPCAF task found. Nothing to do.'));
        return;
      }

      tasksJson.tasks.push({
        "taskName": "spcaf",
        "args": [
          "--vscode"
        ],
        "showOutput": "silent",
        "problemMatcher": {
          "fileLocation": "absolute",
          "pattern": [{
            "regexp": "^([^\\s]+)\\s(.*)$",
            "severity": 1,
            "message": 2
          },
            {
              "regexp": "file\\:\\s(.*)\\sline\\:\\s([\\d]+)",
              "file": 1,
              "line": 2
            }]
        }
      });

      this.log(chalk.yellow('Addng the SPCAF task to .vscode/tasks.json...'));
      this.fs.writeJSON(this.destinationPath('.vscode/tasks.json'), tasksJson);
    },

    upsertSpRuleSet: function () {
      this.log(chalk.yellow('Copying the SharePoint Framework ruleset...'));

      this.fs.copy(
        this.templatePath('SharePointFramework.spruleset'),
        this.destinationPath('SharePointFramework.spruleset')
      );
    }
  },

  install: function () {
    this.npmInstall();
  }
});
