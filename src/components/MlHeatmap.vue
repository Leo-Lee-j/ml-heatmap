<template>
  <div class="heat-map">
    <div class="container">
      <div class="left-side">
        <div class="week">Mon</div>
        <div class="week">Thu</div>
        <div class="week">Sun</div>
      </div>
      <div class="right-side">
        <div class="column-wrapper" v-for="(columnData, columnIndex) in mapData" :key="columnIndex">
          <div class="column" :style="`left: ${columnData.x}px`">
            <div class="title" v-if="columnData.nextMonth"><span>{{columnData.month}}</span></div>
            <div class="square-wrapper">
              <div
                  class="square"
                  v-for="(data, dateIndex) in columnData.data"
                  :key="dateIndex"
                  :style="`background:${getColor(data.count)};top: ${data.y}px`"
              >
                <el-tooltip
                    effect="dark"
                    :content="handleTipContent(data)"
                    placement="top-start"
                >
                  <div class="date" ref="squareRef" />
                </el-tooltip>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="illustration">
      <div>

      </div>
      <div class="legend" v-if="props.illustration">
        <div class="level-desc">{{illustrationFonts[0]}}</div>
        <div class="level level-1"></div>
        <div class="level level-2"></div>
        <div class="level level-3"></div>
        <div class="level level-4"></div>
        <div class="level level-5"></div>
        <div class="level-desc">{{ illustrationFonts[1] }}</div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import moment from 'moment'
import {ref} from "vue";
import {illustrationCN, illustrationEN, monthCn, monthEn} from "./default"


interface Config {
  // Whether to open the level illustration
  illustration?: boolean,
  // target year
  year?: number,
  // default en (cn/en)
  locale?: string,
  /**
   * Five level colors, from small to large.
   * e.g. [x, x, x, x, x]
   */
  levelColor?: Array<string>,
  /**
   * Four level critical value, from small to large.
   * e.g. [2, 4, 6, 8]
   */
  level?: Array<number>
  data: Array<Data>
}

// 提供 props 默认值
const props = withDefaults(defineProps<Config>(), {
  illustration: true,
  year: moment().year(),
  locale: 'en',
  levelColor: () => ['#EBEDF0', '#9BE9A8', '#40C463', '#30A14E', '#216E39'],
  level: () => [1, 4, 8, 12],
  data: () => []
})

const illustrationFonts = props.locale === 'cn' ? illustrationCN : illustrationEN
const squareRef = ref()
const tempArr:Array<DateData> = []
let mapData = ref(tempArr)

/**
 * 初始化图表
 */
const init = () => {
  const targetYear = props.year
  // 以列为单位，每列七天(一周)
  const xCount = 7
  // 获取第一列方块差值, 补充到天数差值
  const column0Diff = moment(new Date(targetYear + '-' + 1 + '-' + 1)).day()
  const yearDays = getYearDays(targetYear) +  (column0Diff === 0 ? 6 : column0Diff -1)
  const yCount = Math.ceil( yearDays / xCount)
  let dateData:Array<DateData> = []

  // 日期计数，月份
  let day = 1, month = 1
  for (let i = 0; i < yCount; i++) {
    let monthDays = new Date(targetYear, month, 0).getDate()
    // 每列开始日期
    const startDate = moment(new Date(targetYear + '-' + month + '-' + day), 'yyyy-MM-DD')
    // 每列开始星期
    const startWeek = moment(startDate).day()
    // 每列方块个数
    let columnCount
    if (startWeek === 0) {
      // 周日
      columnCount = 1
    } else {
      // 最后一列方块数
      if (i === yCount - 1) {
        columnCount = yearDays % xCount
      } else {
        columnCount = 7 - startWeek + 1
      }
    }
    // 当前列是否新月份交替列，如果是显示下一个月份 title
    let columnStartMonth = moment(startDate).month()
    const columnEndDate = moment(startDate).add(columnCount, 'd')
    let columnEndMonth = columnEndDate.month()
    let newMonthMark = false
    // i == 0 显示第一个月的 title
    if ((columnStartMonth !== columnEndMonth && columnEndMonth !== 0) || i == 0) {
      newMonthMark = true
    }
    let monthData:DateData = {
      x: 14 * i,
      month: handleMonthLocale(i, newMonthMark, month),
      nextMonth: newMonthMark,
      startDate: startDate.format('yyyy-MM-DD'),
      // 实际截止日期 -1
      endDate: columnEndDate.subtract(1).format('yyyy-MM-DD'),
      data: []
    }
    // 计算每列生成的方块
    for (let j = 0; j < columnCount; j++) {
      // 每个方块的日期
      const squareDate = moment(new Date(targetYear + '-' + month + '-' + day), 'yyyy-MM-DD')
      // 星期 (星期日===0)
      const squareWeek = moment(squareDate).day()
      let topLc
      if (squareWeek === 0) {
        // 周日在最底层
        topLc = 14 * 6
      } else {
        topLc = (squareWeek - 1) * 14
      }
      // 当前月份
      const squareDateStr = squareDate.format('yyyy-MM-DD')
      let dataCount:DateCount = {
        y: topLc,
        count: getCount(squareDateStr),
        date: squareDateStr,
        week: squareWeek
      }
      monthData.data.push(dataCount)
      // 新月份临界点
      if (day === monthDays) {
        day = 1
        month ++;
      } else {
        day ++
      }
    }
    dateData.push(monthData)
  }
  mapData.value = dateData
}

/**
 * 获取数量
 * @param squareDate 方块日期
 * @return default 0
 */
const getCount = (squareDate:string) => {
  const propData = props.data
  const result = propData.filter(item => {
    return item.date === squareDate
  })
  if (result.length > 0) {
    return result[0].count
  }
  return 0
}

/**
 * 处理头部月份信息
 * @param column 当前列
 * @param newMonth 当前列是否新月份交替
 * @param month 当前月份
 */
const handleMonthLocale = (column:number, newMonth:boolean, month:number) => {
  let index = 0
  if (column !== 0) {
    index = newMonth ? month : month - 1
  }
  if (props.locale === 'cn') {
    return monthCn[index]
  }
  return monthEn[index]
}

/**
 * 处理 Tooltip 内容
 * @param dateCount DateCount
 */
const handleTipContent = (dateCount:DateCount) => {
  const count = dateCount.count
  const date = dateCount.date
  if (count > 0) {
    return count + ' contributions on ' + date
  } else {
    return 'No contributions on ' + date
  }
}

const getColor = (count:number) => {
  const colorArr = props.levelColor
  const levelArr = props.level
  let color
  if (count >= levelArr[4]) {
    color = colorArr[4]
  } else if (count >= levelArr[3]) {
    color = colorArr[3]
  } else if (count >= levelArr[1]) {
    color = colorArr[2]
  } else if (count >= levelArr[0]) {
    color = colorArr[1]
  } else {
    color = colorArr[0]
  }
  return color
}

/**
 * 获取年份天数
 * @param year 默认当前年
 */
const getYearDays = (year?:number) => {
  let targetYear
  if (year && year >= 1970) {
    targetYear = year
  } else {
    targetYear = moment().year()
  }
  let i, days = 0, d
  for (i = 1; i < 13; i++) {
    d = new Date(targetYear, i, 0);
    days += d.getDate();
  }
  return days
}

init()
</script>
<style lang="scss" scoped>

.heat-map {
  max-width: 810px;
  height: 180px;
  background-color: #fff;
  margin: auto;
  padding: 0 0;
  font-size: 12px;
  .container {
    height: 100px;
    display: flex;
    .left-side {
      width: 32px;
      margin-right: 3px;
      font-size: 12px;
      display: -webkit-box;
      display: -ms-flexbox;
      display: flex;
      -webkit-box-orient: vertical;
      -webkit-box-direction: normal;
      -ms-flex-direction: column;
      flex-direction: column;
      -webkit-box-pack: justify;
      -ms-flex-pack: justify;
      justify-content: space-between;
      .week {
        line-height: 12px;
        text-align: center;
        margin-bottom: 4px;
      }
    }

    .right-side {
      position: relative;
      width: 100%;
      display: -webkit-box;
      display: -ms-flexbox;
      display: flex;
      -webkit-box-orient: vertical;
      -webkit-box-direction: normal;
      -ms-flex-direction: column;
      flex-direction: column;
      -ms-flex-wrap: wrap;
      flex-wrap: wrap;
      .column-wrapper {
        position: relative;
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        margin-right: 4px;
        .column {
          position: absolute;
          .title {
            position: absolute;
            top: 0;
            margin-top: -20px;
            margin-left: -10px;
            min-width: 45px;
            font-size: 12px;
            text-align: center;
          }
          .square-wrapper {
            position: relative;
            .square {
              border: 1px solid #e5e5e5;
              border-radius: 3px;
              position: absolute;
              cursor: pointer;
              width: 10px;
              height: 10px;
              transition: all .3s;
              .date {
                width: 11px;
                height: 11px;
                :hover {
                  width: 13px;
                  height: 13px;
                }
              }
            }
            .square:hover {
              box-shadow: 0 0 6px 0 rgba(98,98,98,0.86);
              -webkit-box-shadow: 0 0 6px 0 rgba(98,98,98,0.86);
              -moz-box-shadow: 0 0 6px 0 rgba(98,98,98,0.86);
            }
          }
        }
      }
    }
  }

  .illustration {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 12px;
    .legend {
      display: flex;
      justify-content:center;
      align-items: center;

      .level-desc {
        line-height: 11px;
        margin-right: 6px;
        margin-left: 4px;
      }

      .level {
        border-radius: 3px;
        border: 1px solid #e5e5e5;
        margin-right: 4px;
        width: 11px;
        height: 11px;
      }

      .level-1 {
        background: #EBEDF0;
      }

      .level-2 {
        background: #9BE9A8;
      }

      .level-3 {
        background: #40C463;
      }

      .level-4 {
        background: #30A14E;
      }

      .level-5 {
        background: #216E39;
      }
    }
  }
}
</style>
