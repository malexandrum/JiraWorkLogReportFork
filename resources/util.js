var Utility = {
    days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    getDate: function (dateString) {
        var dt = new Date(dateString);
        return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
    },
    getDateFormatted: function (dateString, showWeekday) {
        var dt = new Date(dateString);
        return dt.getFullYear() + '-' + ('0' + (dt.getMonth() + 1)).slice(-2) + '-' + ('0' + dt.getDate()).slice(-2)
            + (showWeekday ? '<br>' + Utility.days[dt.getDay()] : '');
    },
    getTimeFormatted(timeInSecond) {
        var display = "";
        var days = Math.floor(timeInSecond / (8 * 60 * 60));
        var time = timeInSecond % (8 * 60 * 60);

        if (days > 0) {
            display = days + "d ";
        }

        var hours = Math.floor(time / (60 * 60));
        var minutes = (time % (60 * 60)) / 60;

        if (hours > 0) {
            display = display + hours + "h ";
        }

        if (minutes > 0) {
            display = display + minutes + "m";
        }

        if (days > 0) {
            display += ` (${Math.round(timeInSecond / 3600)}h)`;
        }

        return display;
    },
    getWeekStartDate: function () {
        var today = Utility.getDate(new Date());
        return new Date(today.getTime() - 6 * 24 * 3600000);
    },
    getMonthStartDate: function () {
        var today = Utility.getDate(new Date());
        return new Date(today.getTime() - 29 * 24 * 3600000);
    },
    getQuarterStartDate: function() {
        return new Date('2020-07-01');
    },
    sum: function (arr, prop) {
        return _.reduce(arr, function (sum, elem) {
            return sum + elem[prop];
        }, 0);
    },
    getIssue: function (log) {
        if (Report.data.issues && Report.data.issues[log.issueId]) {
            var issue = Report.data.issues[log.issueId];
            var jiraLink = JIRA.config.host + "/browse/" + issue.key;
            return "<span class='mdl-chip' id='log" + log.id + "'><a target='_blank' href='" + jiraLink + "' class='mdl-chip__text'>" + issue.key + "</a></span>"
                    + "<div class='mdl-tooltip mdl-tooltip--large' data-mdl-for='log" + log.id + "'>" + issue.summary + "</div>";
        }

        return "";
    }
}