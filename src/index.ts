import { Context, Schema } from 'koishi'

export const name = 'thpt'

type Source = 'mix' | 'nodocchi' | 'database'

export interface Config {
  server: string
  defaultSource: Source
}

export const Config: Schema<Config> = Schema.object({
  server: Schema.string().default('http://localhost:7235'),
  defaultSource: Schema.union<Source>(['mix', 'nodocchi', 'database']).default('mix'),
})

const TREND_VALID_TIME = 60 * 60 * 24 * 30

function generateReply(ranks: any) {
  let msg = ranks.description
  const curtime = Date.now() / 1000
  if (ranks.h4.level >= 16 || ranks.h3.level >= 16) msg += '\n最高段位 ' + ranks.hdescription

  let trend4 = '', trend3 = ''
  if (ranks['4'].time_last > curtime - TREND_VALID_TIME && ranks['4'].trend?.length > 10) trend4 = ranks['4'].trend.slice(-10)
  if (ranks['3'].time_last > curtime - TREND_VALID_TIME && ranks['3'].trend?.length > 10) trend3 = ranks['3'].trend.slice(-10)
  if (trend4 || trend3) msg += `\n最近战绩 [${trend4}][${trend3}]`

  if (ranks.h4.level >= 16) msg += '\n四麻首次升凤时间: ' + new Date(1000 * ranks['4'].time_phoenix).toLocaleDateString()
  if (ranks.h4.level >= 17) msg += '\n最高段位达成时间: ' + new Date(1000 * ranks['h4'].time).toLocaleDateString()
  if (ranks.h3.level >= 16) msg += '\n三麻首次升凤时间: ' + new Date(1000 * ranks['3'].time_phoenix).toLocaleDateString()
  if (ranks.h3.level >= 17) msg += '\n最高段位达成时间: ' + new Date(1000 * ranks['h3'].time).toLocaleDateString()
  return msg
}

export function apply(ctx: Context, config: Config) {
  ctx.command('thpt <username>', '查询天凤PT')
    .option('source', '-s <source>', { fallback: config.defaultSource })
    .option('source', '-n', { value: 'nodocchi' })
    .action(({ session, options }, username) => {
      if (!username) return session.execute('thpt -h')
      ctx.http.get(`${config.server}/rank`, {
        params: {
          username: username,
          source: options.source
        }
      }).then(res => {
        session.send(generateReply(res))
      }, _ => {
        session.send('查询失败')
      })
    })

}
