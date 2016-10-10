gulp.task('spcaf', ['bundle'], function (cb) {
  var criticalErrors = 0;
  var criticalWarnings = 0;
  var errors = 0;
  var warnings = 0;

  var logQueue = [];
  var progress = 0;
  var app = spawn('<%= spcafpath %>\\spcaf.exe', ['-i', __dirname, '-r', 'HTML', '-o', __dirname + '\\report.xml', '-v', 'detailed', '-s', __dirname + '\\SharePointFramework.spruleset']);
  app.stdout.on('data', (dataBuffer) => {
    var dataString = dataBuffer.toString();
    // skipping enter
    var lastChar = dataString[dataString.length - 3];
    if (lastChar !== '}') {
      logQueue.push(dataString);
      return;
    }

    // sometimes multiple output messages are included in a single
    // output event. we need to split them into separate messages
    var logLines = dataString.split('\r\n');

    if (logQueue.length > 0) {
      // prepend previously gathered fragments to the latest fragmented message
      // and add it to the log 
      logLines[0] = logQueue.join('') + logLines[0];
      logQueue.length = 0;
    }

    for (var i = 0; i < logLines.length; i++) {
      if (logLines[i].trim().length === 0) {
        continue;
      }

      var obj = JSON.parse(logLines[i]);

      if (obj.Progress && obj.Progress > progress) {
        progress = obj.Progress;
        console.log(chalk.blue(`${progress}%`) + ` ${obj.Message}`);
      }

      if (obj.Kind !== 'Rule') {
        continue;
      }

      if (obj.Type === 'Notification') {
        var errorSeverity = null;
        switch (obj.Severity) {
          case 'CriticalError':
            errorSeverity = getSeverityIcon(obj.Severity);
            criticalErrors++;
            break;
          case 'Error':
            errorSeverity = getSeverityIcon(obj.Severity);
            errors++;
            break;
          case 'CriticalWarning':
            errorSeverity = getSeverityIcon(obj.Severity);
            criticalWarnings++;
            break;
          case 'Warning':
            errorSeverity = getSeverityIcon(obj.Severity);
            warnings++;
            break;
        }

        console.log(`${errorSeverity} ${obj.Message}`);
        console.log(chalk.gray(`    file: ${obj.WSPRelativeLocation} line: ${obj.LineNumber}`));
      }
    }
  });
  app.stderr.on('data', (data) => {
    console.log(`stderr: ${data}`);
  });
  app.on('close', (code) => {
    console.log(" ");
    console.log(`Total notifications: ${criticalErrors + errors + criticalWarnings + warnings}`)

    if (criticalErrors > 0) {
      console.log(chalk.bgRed(`${criticalErrors}`) + ` Critical Errors`);
    }

    if (errors > 0) {
      console.log(chalk.red(`${errors}`) + ` Errors`);
    }

    if (criticalWarnings > 0) {
      console.log(chalk.yellow(`${criticalWarnings}`) + ` Critical Warnings`);
    }

    if (warnings > 0) {
      console.log(chalk.yellow(`${warnings}`) + ` Warnings`);
    }
    cb();
  });

  function getSeverityIcon(severity) {
    var inVsCode = argv.vscode;

    switch (severity) {
      case 'CriticalError':
        return inVsCode ? 'error' : chalk.bgRed(' ✘ ');
      case 'Error':
        return inVsCode ? 'error' : chalk.red(' ✘ ');
      case 'CriticalWarning':
        return inVsCode ? 'warning' : chalk.bgYellow('[!]');
      case 'Warning':
        return inVsCode ? 'warning' : chalk.yellow('[!]');
    };
  }
});