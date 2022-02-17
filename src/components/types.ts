interface Data {
    /**
     * format: yyyy-MM-DD
     */
    date: string,
    count: number
}

interface DateData {
    // x position
    x: number,
    month: string,
    nextMonth: boolean,
    startDate: string,
    endDate: string,
    data: Array<DateCount>
}

interface DateCount {
    // y position
    y: number,
    count: number,
    week: number,
    date: string
}
