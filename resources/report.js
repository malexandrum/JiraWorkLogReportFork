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
        var template = _.template($(templateId).html());

        $('.report-content').html(template({ data: reportData, users: Report.data.usersByName }));
        componentHandler.upgradeAllRegistered();

        renderAggregatesContainer();
        renderLoggedByProjectIssueType(logs, Report.data.issues)
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
            alert('Maxmium reporting period is one year');
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

    $('#start-date,#end-date').on('keypress',function(e) {
        if(e.which == 13) {
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

function renderLoggedByProjectIssueType(logs, issues) {
    const loggedByProjectIssueType = {}, projectsById = {}, issueTypesById = {};
    logs.forEach(log => {
        let issue = issues[log.issueId];
        const key = issue.key;
        let { project, issueType } = issue;
        if (issue.parentKey && issues[issue.parentId].issueType.name !== 'Epic') {
            issueType = issues[issue.parentId].issueType
        }
        projectsById[project.id] = project;
        issueTypesById[issueType.id] = issueType;
        if (loggedByProjectIssueType[project.id]) {
            if (loggedByProjectIssueType[project.id][issueType.id]) {
                loggedByProjectIssueType[project.id][issueType.id].time += log.time;
                if (loggedByProjectIssueType[project.id][issueType.id].issueKeys.indexOf(key) === -1) {
                    loggedByProjectIssueType[project.id][issueType.id].issueKeys.push(key);
                }
            } else {
                loggedByProjectIssueType[project.id][issueType.id] = { time: log.time, issueKeys: [key] };
            }
        } else {
            loggedByProjectIssueType[project.id] = { [issueType.id]: { time: log.time, issueKeys: [key] } }
        }

    });

    Report.data.loggedByProject = loggedByProjectIssueType;

    const el = document.getElementById('aggregate');
    el.insertAdjacentHTML('beforeend', '<br>');

    const t1 = document.createElement('table');

    t1.insertAdjacentHTML('afterbegin', `<tr><th>Project</th><th>Issue Type</th><th>Hours</th><th>Issues</th></tr>`);

    const lines = [];

    for (const projectId in loggedByProjectIssueType) {
        const project = projectsById[projectId];

        const projectLines = []
        for (const issueTypeId in loggedByProjectIssueType[projectId]) {
            const issueType = issueTypesById[issueTypeId];
            const time = loggedByProjectIssueType[projectId][issueTypeId].time;
            const issueKeys = loggedByProjectIssueType[projectId][issueTypeId].issueKeys;
            projectLines.push({
                project: project.name,
                issueType: issueType.name,
                time,
                issueKeys
            });
        }
        projectLines.sort((a, b) => b.time - a.time)
        lines.push(...projectLines);
    }

    let projectName;

    const config = Configuration.getCurrentConfig();

    lines.forEach(l => {
        const { project, issueType, time } = l;
        let tr = document.createElement('tr');
        const td1 = document.createElement('td');
        // td1.rowSpan = Object.keys(loggedByProjectIssueType[projectId]).length;
        td1.innerHTML = project;
        if (project === projectName) {
            td1.style.opacity = .3
        }
        projectName = project;

        tr.appendChild(td1);
        const td2 = document.createElement('td');
        td2.innerHTML = issueType
        tr.appendChild(td2);
        const td3 = document.createElement('td');
        td3.innerHTML = (time / 3600).toFixed(2);
        td3.style.textAlign = 'right';
        tr.appendChild(td3);
        const td4 = document.createElement('td');
        td4.style.fontSize = 'smaller';
        td4.innerHTML = sortIssueKeys(l.issueKeys).map(ik => (`<a target=_blank href="${config.host}/browse/${ik}">${ik}</a>`)).join(' ');
        tr.appendChild(td4)
        t1.appendChild(tr)
    });


    el.appendChild(t1);

    function sortIssueKeys(arr) {
        arr.sort((a, b) => {
            const normalizedA = normalizeIssueKey(a);
            const normalizedB = normalizeIssueKey(b);
            if (normalizedA < normalizedB) {
                return -1;
            } else if (normalizedA === normalizedB) {
                return 0;
            }
            return 1;
        })
        return arr;
    }

    function normalizeIssueKey(k) {
        const split = k.split('-');
        return `${split[0]}-` + `${split[1]}`.padStart(10, '0')
    }

}