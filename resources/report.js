var Report = {
    data: {},
    getRenderConfig: function () {
        return {
            timeFrame: $('.option-time-frame').val(),
            groupBy: $('.option-group-by').val(),
            dateSort: $('.option-date-sort').val(),
            start: $('#start-date').val(),
            end: $('#end-date').val()
        };
    },
    getfilteredLogs: function (config) {
        var { startDate, endDate } = this.getStartEndDates();
        var selectedUsers = Configuration.getUserSelection(window.localStorage.getItem('selected_team_id'));
        return _.filter(Report.data.logs, function (log) {
            return log.date >= startDate && (endDate ? log.date < endDate : true) && (selectedUsers == null || _.indexOf(selectedUsers, log.username) > -1);
        });
    },
    getStartEndDates: function () {
        var startDate, endDate;
        var config = Report.getRenderConfig();
        switch (config.timeFrame) {
            case '1WK':
                startDate = Utility.getWeekStartDate();
                endDate = Utility.getTomorrow();
                break;
            case '1MO':
                startDate = Utility.getMonthStartDate();
                endDate = Utility.getTomorrow();
                break;
            case 'Q':
                startDate = Utility.getCalendarQuarterStartDate();
                endDate = Utility.getTomorrow();
                break;
            case 'PQ':
                startDate = Utility.getCalendarPreviousQuarterStartDate();
                endDate = Utility.getCalendarQuarterStartDate();
                break;
            case 'C':
                startDate = Utility.getStart();
                endDate = Utility.getEnd();
                break;
            default:
                console.error('Unknown period option: ', config.timeFrame);
        }
        return { startDate, endDate };
    },
    getLogsGroupedByUser(logs, config) {
        var reportData = [];
        var logsGroupByUser = _.groupBy(logs, function (log) { return log.username; });
        _.each(logsGroupByUser, function (grp, username) {
            var groupedByDays = _.groupBy(grp, function (log) { return log.date; });
            var groupedByDayLogs = _.sortBy(_.map(groupedByDays, function (logArray, date) {
                return {
                    date: new Date(date),
                    logs: logArray,
                    totalTime: Utility.sum(logArray, 'time')
                };
            }), function (log) {
                var time = log.date.getTime();
                return config.dateSort == "DSC" ? -1 * time : time;
            });

            reportData.push({ username: username, logs: groupedByDayLogs, totalTime: Utility.sum(groupedByDayLogs, 'totalTime') });
        });

        return _.sortBy(reportData, function (dt) { return Report.data.usersByName[dt.username].displayName; });
    },
    getLogsGroupedByDate(logs, config) {
        var reportData = [];
        var logsGroupByDate = _.groupBy(logs, function (log) { return log.date; });
        _.each(logsGroupByDate, function (grp, date) {
            var groupedByUser = _.groupBy(grp, function (log) { return log.username; });
            var groupedByUserLogs = _.sortBy(_.map(groupedByUser, function (logArray, username) {
                return {
                    username: username,
                    logs: logArray,
                    totalTime: Utility.sum(logArray, 'time')
                };
            }), function (log) {
                return Report.data.usersByName[log.username].displayName;;
            });

            reportData.push({ date: new Date(date), logs: groupedByUserLogs, totalTime: Utility.sum(groupedByUserLogs, 'totalTime') });
        });

        return _.sortBy(reportData, function (dt) {
            var time = dt.date.getTime();
            return config.dateSort == "DSC" ? -1 * time : time;
        });
    },
    renderLogs: function () {
        var renderConfig = Report.getRenderConfig();
        var logs = Report.getfilteredLogs(renderConfig);
        var reportData = renderConfig.groupBy == 'USR' ?
            Report.getLogsGroupedByUser(logs, renderConfig) :
            Report.getLogsGroupedByDate(logs, renderConfig);

        var templateId = renderConfig.groupBy == "DT" ? "#tmpl-logs-by-date" : "#tmpl-logs-by-user";
        var templateHtml = $(templateId).html();
        var renderedHtml = renderReportTemplate(templateHtml, { data: reportData, users: Report.data.usersByName });
        $('.report-content').html(renderedHtml);
        componentHandler.upgradeAllRegistered();

        renderAggregatesContainer();
        renderConfigurableReport(logs, Report.data.issues)
        renderLoggedByUser(logs)
    },
    selectionChanged: function ($item) {
        if ($item.hasClass('option-team')) {
            window.localStorage.setItem('selected_team_id', $item.val());
            Report.renderPage();
        } else if ($item.hasClass('option-users')) {
            var currentSelection = $('.option-users option').map(function (i, elem) { return { name: $(elem).val(), selected: $(elem).prop('selected') }; });
            Configuration.saveUserSelection(window.localStorage.getItem('selected_team_id'), currentSelection);
            Report.renderLogs();
        }
        else if ($item.hasClass('option-group-by')) {
            Report.renderLogs();
        }
        else {
            Report.renderPage();
        }
    },
    renderUserSelect: function () {
        $optionUsers = $('.option-users');
        if ($optionUsers[0].sumo) {
            $optionUsers[0].sumo.unload();
            $optionUsers.empty();
        }

        var selectedUsers = Configuration.getUserSelection(window.localStorage.getItem('selected_team_id')) || [];

        _.each(Report.data.users, function (user) {
            var selected = _.indexOf(selectedUsers, user.name) == -1 ? '' : ' selected="selected"';
            $optionUsers.append('<option value="' + user.name + '"' + selected + '>' + user.displayName + '</option>');
        });

        $optionUsers.SumoSelect({ selectAll: true }); // { selectAll: Report.data.users.length > 1 }
    },
    renderPage: function () {
        var jiraConfigs = Configuration.getConfigs();
        if (jiraConfigs.length < 1) {
            return;
        }

        var selectedTeamId = window.localStorage.getItem('selected_team_id');
        if (!selectedTeamId || _.findIndex(jiraConfigs, function (c) { return c.id == selectedTeamId; }) < 0) {
            selectedTeamId = jiraConfigs[0].id;
            window.localStorage.setItem('selected_team_id', selectedTeamId);
        }

        var selectedTeam = null;

        var $teamDD = $('.option-team').empty();
        for (var i = 0; i < jiraConfigs.length; i++) {
            var selected = '';
            if (jiraConfigs[i].id == selectedTeamId) {
                selectedTeam = jiraConfigs[i];
                selected = ' selected="selected"';
            }

            $teamDD.append('<option value="' + jiraConfigs[i].id + '"' + selected + '>' + jiraConfigs[i].name + '</option>');
        }

        $('.report-content').html('');
        $('.jira-api-call-progress').show();


        var { startDate, endDate } = this.getStartEndDates();

        if (endDate && endDate.getTime() - startDate.getTime() > 366 * Utility.MILLISINDAY) {
            alert('Maximum reporting period is one year');
            return;
        }

        JIRA.config = selectedTeam;
        JIRA.getWorkLogs(startDate, endDate).done(function (data) {
            $('.jira-api-call-progress').hide();
            $(".report-config-item").show();

            Report.data = {
                logs: data.logs,
                users: data.users,
                usersByName: _.indexBy(data.users, 'name'),
                issues: data.issues
            }
            Report.renderUserSelect();
            Report.renderLogs();

        }).fail(function (errorText) {
            $('.jira-api-call-progress').hide();
            $(".report-config-item:not(:first-child)").hide();
            $('.report-content').html('<p>Failed to retrieve data from JIRA API. Please check JIRA connection configuration and try again.</p>');
            if (errorText) {
                $('.report-content p').append('<br>' + errorText);
            }
        });
    }
};

$(document).ready(function () {
    if (Configuration.getConfigs().length < 1) {
        Configuration.renderDialog();
    } else {
        Report.renderPage();
    }

    $('.report-config-panel select').change(function () {
        Report.selectionChanged($(this));
    });

    Utility.setStartEnd();
    $('.option-time-frame').change(Utility.setStartEnd);

    $('#start-date,#end-date').on('keypress', function (e) {
        if (e.which == 13) {
            $('.option-time-frame').val('C');
            Report.selectionChanged($(this));
        }
    });
});

function renderAggregatesContainer() {
    const disposable1 = document.getElementById('aggregate-mask');
    if (disposable1) { disposable1.remove() }
    const disposable2 = document.getElementById('aggregate');
    if (disposable2) { disposable2.remove(); }

    const d = document.createElement('div');
    d.id = 'aggregate';
    Object.assign(d.style, {
        position: 'fixed',
        color: 'black',
        padding: 10,
        backgroundColor: 'white',
        boxShadow: 1,
        opacity: 1,
        display: 'none',
        flexDirection: 'column',
        zIndex: 1001,
        padding: '20px',
        left: '50%',
        transform: 'translate(-50%, 0)',
        top: '100px',
    });

    const placeholder = document.querySelector('.report-config-item label');
    const mask = document.createElement('div');
    mask.id = 'aggregate-mask'
    Object.assign(mask.style, {
        position: 'fixed',
        display: 'none',
        width: '100%',
        height: '100%',
        backgroundColor: 'black',
        opacity: .3,
        zIndex: 1000
    });

    placeholder.addEventListener('click', () => {
        mask.style.display = 'flex';
        d.style.display = 'flex';
    });

    placeholder.style.cursor = 'context-menu';

    mask.addEventListener('click', () => {
        mask.style.display = 'none';
        d.style.display = 'none';
    });

    document.body.appendChild(mask);
    document.body.appendChild(d);

}

function renderLoggedByUser(worklogs) {
    var dict = {};
    worklogs.forEach(l => {
        const person = l.userDisplayName;
        if (!dict[person]) { dict[person] = 0; }
        dict[person] += l.time / 3600;
    });
    const arr = [];
    for (let k in dict) {
        arr.push({ name: k, time: dict[k] });
    }
    arr.sort((a, b) => b.time - a.time)

    const d = document.getElementById('aggregate');
    d.insertAdjacentHTML('beforeend', `<br>`);

    const t = document.createElement('table');
    d.appendChild(t);

    arr.forEach(el => {
        t.innerHTML += `<tr>
            <td>${el.name}</td>
            <td style="text-align: right;">${el.time.toFixed(2)}</td>
        </tr>`;
    });
}



function renderConfigurableReport(logs, issues) {
    const data = logs.map(l => {
        // if subtask, get parent's issueType        
        const { parentId } = issues[l.issueId];
        let issueType = issues[l.issueId].issueType.name;
        if (parentId && issues[parentId].issueType.name !== 'Epic') {
            issueType = issues[parentId].issueType.name
        }
        let issueName = issues[l.issueId].parentSummary ?? issues[l.issueId].summary;
        let epicName = '';  
        if (parentId && issues[parentId].issueType.name !== 'Epic') {
            epicName = issues[parentId].parentSummary;
        } else {
            epicName = issues[l.issueId].parentSummary;
            issueName = issues[l.issueId].summary;
        }
        return ({
            project: issues[l.issueId].project && issues[l.issueId].project.name,
            issueType: issueType,
            issueName: issueName,
            epicName: epicName,
            month: l.date && l.date.toISOString().substr(0, 7) + '-01',
            user: l.userDisplayName,
            time: l.time,
            issueKey: issues[l.issueId].key,
            parentKey: issues[l.issueId].parentKey
        });
    });

    let groupBy = [];
    try {
        groupBy = JSON.parse(Configuration.getCurrentConfig().groupBy || DEFAULT_GROUPBY);
    } catch(ex) {
        alert(`Group By Column setting could not be parsed. Using default. ${ex}`);
        groupBy = JSON.parse(DEFAULT_GROUPBY);
    }
    
    const grouppedData = Utility.groupArrayByProps(data, groupBy, [
        { field: 'time', fn: (a, b) => a + b, initialValue: 0 },
        { field: 'issueKey', fn: (a, b) => (a.indexOf(b) === -1 ? [...a, b] : a), initialValue: [] },
    ],
        {
            time: v => ((+v / 3600).toFixed(2)),
            issueKey: storyKeys => storyKeys.sort().map(sk => `<a href="${Configuration.getCurrentConfig().host}/browse/${sk}" target="_blank">${sk}</a>`).join(', ')
        }
    )

    const el = document.getElementById('aggregate');
    el.insertAdjacentHTML('beforeend', '<br>');

    const t1 = document.createElement('table');

    const columns = groupBy.concat([
        'time',
        'issueKey'
    ]);

    const th = `<tr>${columns.map(c => "<th>"+c+"</th>").join('')}</tr>`;
    t1.insertAdjacentHTML('afterbegin', th);

    grouppedData.forEach(l => {
        const row = document.createElement('tr');
        columns.forEach(field => {
            const cell = document.createElement('td')
            cell.innerHTML = l[field];
            field === 'issueKey' && (cell.style = 'font-size: smaller;')
            field === 'time' && (cell.style = 'text-align: right; white-space: nowrap;')
            field === 'month' && (cell.style = 'white-space: nowrap;')            
            row.appendChild(cell)
        })
        t1.appendChild(row);
    })

    el.appendChild(t1)
}