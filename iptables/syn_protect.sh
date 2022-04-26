#!/bin/bash
#防止SYN攻击 轻量级预防

iptables -N syn-flood

iptables -A INPUT -p tcp --syn -j syn-flood

iptables -I syn-flood -p tcp -m limit --limit 3/s --limit-burst 6 -j RETURN

iptables -A syn-flood -j REJECT