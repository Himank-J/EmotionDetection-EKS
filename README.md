Access to:
- AmazonEKSClusterPolicy
- AmazonEC2FullAccess
- IAMFullAccess
- AWSCloudFormationFullAccess

# Create the policy
aws iam create-policy \
    --policy-name EKSFullAccess \
    --policy-document file://eks-full-access-policy.json

# Attach the policy to the role
aws iam attach-role-policy \
    --role-name himank-emlo-user \
    --policy-arn arn:aws:iam::<YOUR-ACCOUNT-ID>:policy/EKSFullAccess

# Attach the policy to the user
aws iam attach-user-policy \
    --user-name himank-emlo \
    --policy-arn arn:aws:iam::<YOUR-ACCOUNT-ID>:policy/EKSFullAccess

eksctl create cluster -f eks-cluster.yaml

eksctl utils associate-iam-oidc-provider --region ap-south-1 --cluster eks-cluster --approve

curl -o iam-policy.json <https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/v2.11.0/docs/install/iam_policy.json>

aws iam create-policy --policy-name AWSLoadBalancerControllerIAMPolicy --policy-document file://iam-policy.json

aws iam attach-role-policy \
    --role-name himank-emlo-user \
    --policy-arn arn:aws:iam::390430468701:policy/AWSLoadBalancerControllerIAMPolicy

eksctl create iamserviceaccount \
--cluster=eks-cluster \
--namespace=kube-system \
--name=aws-load-balancer-controller \
--attach-policy-arn=arn:aws:iam::390430468701:policy/AWSLoadBalancerControllerIAMPolicy \
--override-existing-serviceaccounts \
--region ap-south-1 \
--approve

helm repo add eks https://aws.github.io/eks-charts

helm install aws-load-balancer-controller eks/aws-load-balancer-controller -n kube-system --set clusterName=eks-cluster --set serviceAccount.create=false --set serviceAccount.name=aws-load-balancer-controller


# Cluster Autoscaler

eksctl create iamserviceaccount \
--cluster=eks-cluster \
--namespace=kube-system \
--name=cluster-autoscaler \
--attach-policy-arn=arn:aws:iam::390430468701:policy/AWSClusterAutoScalerIAMPolicy \
--override-existing-serviceaccounts \
--region ap-south-1 \
--approve

aws iam create-policy --policy-name AWSClusterAutoScalerIAMPolicy --policy-document file://CAPolicy.json

# build docker image and push to ECR

# create ECR repository
aws ecr create-repository --repository-name modelbackend --region ap-south-1

# login to ECR
aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin 390430468701.dkr.ecr.ap-south-1.amazonaws.com

# build docker image
docker build -t modelbackend:latest .

# tag docker image
docker tag modelbackend:latest 390430468701.dkr.ecr.ap-south-1.amazonaws.com/modelbackend:latest

# push to ecr
docker push 390430468701.dkr.ecr.ap-south-1.amazonaws.com/modelbackend:latest

eksctl delete cluster -f eks-cluster.yaml