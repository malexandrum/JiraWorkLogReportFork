var Utility = {
    days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    MILLISINDAY: 24 * 60 * 60 * 1000,
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
        return new Date(today.getTime() - 6 * Utility.MILLISINDAY);
    },
    getMonthStartDate: function () {
        var today = Utility.getDate(new Date());
        return new Date(today.getTime() - 29 * Utility.MILLISINDAY);
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
    getStart: function () {
        const config = Report.getRenderConfig();
        const start = new Date(config.start);
        if (isNaN(start.getTime())) {
            alert('Invalid Start Date');
            return;
        }
        return start;
    },
    getEnd: function () {
        const config = Report.getRenderConfig();
        let end = new Date(config.end);
        end = new Date(end.getTime() + Utility.MILLISINDAY);
        if (isNaN(end.getTime())) {
            alert('Invalid End Date');
            return;
        }
        return end;
    },
    getTomorrow: function () {
        // this will not work well on day summer time ends (will not include today's stories)
        const t = new Date();
        t.setMilliseconds(0);
        t.setSeconds(0);
        t.setMinutes(0);
        t.setHours(0);
        return new Date(t.getTime() + Utility.MILLISINDAY);
    },
    getWorkDays: function (start, end) {
        // TODO
        return;
    },
    setStartEnd: function () {
        let { startDate, endDate } = Report.getStartEndDates();
        endDate = new Date(endDate.getTime() - Utility.MILLISINDAY);
        $('#start-date').val(startDate ? startDate.toLocaleDateString() : '');
        $('#end-date').val(endDate ? endDate.toLocaleDateString() : '');
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
                + `<span class='issue-status noselect' style="background-color: ${this.mapStatusColor(issue.statusColor)};">${issue.status}</span>`
                + "<div>" + this.keepFirstN(issue.summary, 256) || '' + "</div>";
        }

        return "";
    },
    getParent: function (log) {
        const issue = Report.data.issues[log.issueId];
        const jiraParentLink = JIRA.config.host + "/browse/" + issue.parentKey;

        return issue.parentKey ? `<span class="mdl-chip" id="parent-${log.id}"><a target="_blank" href="${jiraParentLink}" class="mdl-chip__text">${issue.parentKey}</a></span>
            <span class='issue-status noselect' style="background-color: ${this.mapStatusColor(issue.parentStatusColor)};">${issue.parentStatus}</span>
                <div>${this.keepFirstN(issue.parentSummary, 256) || ''}</div>` : '';
    },
    keepFirstN: function (t, n = 32) {
        if (t) {
            return t.substr(0, n) + (t.length > n ? ' ...' : '');
        }
        return '';
    },
    mapStatusColor: function (color) {
        switch (color) {
            case 'yellow':
                return 'orange';
            case 'blue-gray':
                return 'blue';
            default:
                return color;
        }
    },
    groupArrayByProps: function (arr, groupByProps, reducers, renderers) {
        const h = {}
        arr.forEach(item => {
            const keyArr = groupByProps.map(gp => item[gp])

            const key = JSON.stringify(keyArr)
            h[key] = h[key] || []
            reducers.forEach((reducer, i) => {
                h[key][i] = h[key][i] || []
                h[key][i].push(item[reducer.field])
            })
        })
        const res = []
        Object.keys(h).sort().forEach(k => {
            h[k] = h[k].map((v, i) => v.reduce(reducers[i].fn, reducers[i].initialValue))
            const row = {}
            const keyArr = JSON.parse(k)
            groupByProps.forEach((gp, i) => {
                row[gp] = keyArr[i]
            })
            reducers.forEach((reducer, i) => {
                row[reducer.field] = renderers && renderers[reducer.field] ? renderers[reducer.field](h[k][i]) : h[k][i]
            })
            res.push(row)
        })
        return res;
    }
}

// export default {Utility}