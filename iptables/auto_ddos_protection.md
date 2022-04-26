自动封禁ip，防御ddos
 
[root@test3-237 ~]# mkdir /root/bin
[root@test1-237 ~]# cat /root/bin/dropip.sh    //此脚本自动提取攻击ip，然后自动屏蔽
#!/bin/bash
/bin/netstat -na|grep ESTABLISHED|awk '{print $5}'|awk -F: '{print $1}'|sort|uniq -c|sort -rn|head -10|grep -v -E '192.168|127.0'|awk '{if ($2!=null && $1>4) {print $2}}'>/tmp/dropip
for i in $(cat /tmp/dropip)
do
/sbin/iptables -A INPUT -s $i -j DROP
echo “$i kill at `date`”>>/var/log/ddos
done
 
以上脚本中最重要的是第二行，即：
获取ESTABLISHED连接数最多的前10个ip并写入临时文件/tmp/dropip,排除了内部ip段192.168|127.0开头的.通过for循环将dropip里面的ip通过iptables全部drop掉，然后写到日志文件/var/log/ddos。
 
 
给脚本添加执行权限
[root@test1-237 ~]# chmod +x /root/bin/dropip.sh
 
添加到计划任务，每分钟执行一次
[root@test1-237 ~]#crontab -e
*/1 * * * * /root/bin/dropip.sh
 
----------------------------------------------------------------------------------------
下面是针对连接数屏蔽IP
#!/bin/sh 
/bin/netstat -ant |grep 80 |awk '{print $5}' |awk -F":" '{print $1}' |sort |uniq -c |sort -rn |grep -v -E '192.168|127.0' |awk '{if ($2!=null && $1>50)}' > /root/drop_ip.txt 
for i in `cat /root/drop_ip.txt` 
do 
/sbin/iptables -I INPUT -s $i -j DROP; 
done 