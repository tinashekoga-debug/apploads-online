ls ~
git status
git init
git remote add origin https://github.com/tinashekoga-debug/apploads-online.git
git remote -v
git add .
git commit -m "Initial deploy from Ubuntu environment"
git branch -M main
git push -u origin main
~~~~~~~~~~~~~
git push -u origin main --force
rm -f .bash_history
echo ".bash_history" >> .gitignore
git rm --cached .bash_history 2>/dev/null || true
git add .
git commit -m "Remove bash history and secure repo"
git push -u origin main --force
git remote -v
git remote set-url origin git@github.com:tinashekoga-debug/apploads-online.git
git remote -v
ssh -T git@github.com
git fetch origin
git reset --hard origin/main
/storage/emulated/0/Apploadsv3.1
/storage/emulated/0/Apploadsv3.1/
ls /storage/emulated/0/
ls /storage/emulated/0/Apploadsv3.1
cd ~
ls
find . -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} +
ls -a
cp -r /storage/emulated/0/Apploadsv3.1/* .
ls
git status
git add .
git commit -m "Deploy AppLoads v3.1"
git push origin main
ls ~/.ssh
ssh-keygen -t ed25519 -C "ubuntu-apploads"
ls ~/.ssh
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519
cat ~/.ssh/id_ed25519.pub
ssh -T git@github.com
git push origin main
pwd
ls -a
cd ~
ls -a
nano deploy
chmod +x deploy
exit
cd /storage/emulated/0/AppLoadsv3.1
~~~~
./deploy
cd ~
ls -a
cd ~
git status
./deploy
~~
git rm --cached -r .ssh
echo ".ssh/" >> .gitignore
git add .gitignore
git commit --amend --no-edit
git push --force
git push --set-upstream origin main --force
git push
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
