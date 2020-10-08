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
    getCalendarQuarterStartDate: function () {
        const currentTime = new Date();
        const currentMonth = currentTime.getMonth();
        const quarterStartMonth = currentMonth - currentMonth % 3;
        return new Date(currentTime.getFullYear(), quarterStartMonth, 1, 0, 0, 0, 0);
    },
    getCalendarPreviousQuarterStartDate: function () {
        const result = this.getCalendarQuarterStartDate();
        result.setMonth(result.getMonth() - 3);
        return result;
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
            + `<span class='issue-status noselect'>${issue.status}</span>`
                + "<div>" + this.keepFirstN(issue.summary, 256) || '' + "</div>";
        }

        return "";
    },
    getParent: function (log) {
        const issue = Report.data.issues[log.issueId];
        const jiraParentLink = JIRA.config.host + "/browse/" + issue.parentKey;

        return issue.parentKey ? `<span class="mdl-chip" id="parent-${log.id}"><a target="_blank" href="${jiraParentLink}" class="mdl-chip__text">${issue.parentKey}</a></span>
            <span class='issue-status noselect'>${issue.parentStatus}</span>
                <div>${this.keepFirstN(issue.parentSummary, 256) || ''}</div>` : '';
    },
    keepFirstN: function (t, n = 32) {
        if (t) {
            return t.substr(0, n) + (t.length > n ? ' ...' : ''); 
        }
        return '';
    }
}